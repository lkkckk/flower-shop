"""Back up PostgreSQL and both image directories; designed for a systemd timer.

Configuration is read from the process environment. Never prints connection secrets.
Restore: python3 scripts/backup.py --restore ARCHIVE --database TARGET_DATABASE
Restore requires a new database name and never drops/replaces an existing database.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
from urllib.parse import urlparse, unquote


def pg_env(database=None):
    url = urlparse(os.environ['DATABASE_URL'])
    env = os.environ.copy()
    env.update(PGHOST=url.hostname or 'localhost', PGPORT=str(url.port or 5432),
               PGUSER=unquote(url.username or ''), PGPASSWORD=unquote(url.password or ''),
               PGDATABASE=database or url.path.lstrip('/'))
    return env


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def backup():
    root = Path(os.environ.get('FLOWER_BACKUP_DIR', '/var/backups/flower-shop')).resolve()
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    timestamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    destination = root / f'flower-{timestamp}.tar.gz'
    with tempfile.TemporaryDirectory(dir=root) as temporary:
        stage = Path(temporary)
        subprocess.run(['pg_dump', '--format=custom', '--file', str(stage / 'database.dump')], env=pg_env(), check=True)
        for name, variable in [('products', 'PRODUCT_IMAGE_DIR'), ('preorder-images', 'PREORDER_IMAGE_DIR')]:
            source = Path(os.environ[variable]).resolve()
            if not source.is_dir():
                raise RuntimeError(f'{variable} is not a directory')
            shutil.copytree(source, stage / name)
        manifest = {str(p.relative_to(stage)): digest(p) for p in stage.rglob('*') if p.is_file()}
        (stage / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        pending = destination.with_suffix('.pending')
        with tarfile.open(pending, 'w:gz') as archive:
            for path in stage.iterdir():
                archive.add(path, arcname=path.name)
        pending.replace(destination)
        destination.chmod(0o600)
    # Retention applies only to this script's named archives in the checked backup directory.
    keep_days = max(7, int(os.environ.get('FLOWER_BACKUP_DAYS', '30')))
    cutoff = dt.datetime.now().timestamp() - keep_days * 86400
    for path in root.glob('flower-????????T??????Z.tar.gz'):
        if path.is_file() and path.stat().st_mtime < cutoff:
            path.unlink()
    print(json.dumps({'status': 'ok', 'archive': str(destination), 'sha256': digest(destination)}))


def restore(archive_path, database):
    import re
    if not database or not re.fullmatch(r'flower_restore_[a-zA-Z0-9_]+', database):
        raise RuntimeError('Restore target must be a new flower_restore_* database')
    with tempfile.TemporaryDirectory() as temporary:
        stage = Path(temporary)
        with tarfile.open(archive_path) as archive:
            for member in archive.getmembers():
                target = (stage / member.name).resolve()
                if not target.is_relative_to(stage.resolve()) or member.issym() or member.islnk():
                    raise RuntimeError('Unsafe archive member')
            archive.extractall(stage, filter='data')
        manifest = json.loads((stage / 'manifest.json').read_text(encoding='utf-8'))
        for name, expected in manifest.items():
            path = (stage / name).resolve()
            if not path.is_relative_to(stage.resolve()) or digest(path) != expected:
                raise RuntimeError('Backup checksum mismatch')
        env = pg_env(database)
        subprocess.run(['createdb', '--maintenance-db=postgres', database], env=env, check=True)
        subprocess.run(['pg_restore', '--exit-on-error', '--no-owner', '--dbname', database, str(stage / 'database.dump')], env=env, check=True)
        images = Path(os.environ.get('FLOWER_RESTORE_IMAGE_ROOT', '/var/backups/flower-shop/restored')) / database
        images.mkdir(parents=True, exist_ok=False, mode=0o700)
        for name in ('products', 'preorder-images'):
            shutil.copytree(stage / name, images / name)
    print(json.dumps({'status': 'restored', 'database': database, 'images': str(images)}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--restore')
    parser.add_argument('--database')
    args = parser.parse_args()
    if args.restore:
        restore(args.restore, args.database)
    else:
        backup()
