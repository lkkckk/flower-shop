const { Icon: HomeIcon, Card: HomeCard, Tag: HomeTag, Spark: HomeSpark } = window;

const reservations = [
  { d: "28", m: "04月", no: "PU2026042500001", name: "李娜", tag: "3天后", tone: "amber", time: "04-28 23:59 · 还剩 2 天", amt: "¥4.50" },
  { d: "01", m: "05月", no: "PU2026042600001", name: "王华", tag: "7天内", tone: "red", time: "05-01 11:31 · 还剩 5 天", amt: "¥60.00" },
];

function Kpi({ label, value, unit, icon, tone, foot, delta, seed }) {
  return (
    <div className="kpi fade-up">
      <div className="kpi-head">
        <div className="kpi-label">{label}</div>
        <div className={"kpi-icon " + (tone || "")}><HomeIcon name={icon} /></div>
      </div>
      <div className="kpi-value">{value}<span className="unit">{unit}</span></div>
      <HomeSpark seed={seed} />
      <div className="kpi-foot"><span>{foot}</span><span className="trend up">↑ {delta}</span></div>
    </div>
  );
}

function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-text">
          <h1>早上好，花店老板 <HomeIcon name="leaf" /></h1>
          <div className="hero-meta">
            <span>2026 年 04 月 26 日</span><span className="dot-sep" />
            <span>Sunday</span><span className="dot-sep" />
            <span>谷雨生意兴隆</span><span className="dot-sep" />
            <span>今日店内 4 位员工已签到</span><span className="dot-sep" />
            <span>气温 18° · 适合鲜花保养</span>
          </div>
        </div>
        <button className="hero-cta"><HomeIcon name="plus" /> 立即开单</button>
      </section>

      <section className="kpi-grid">
        <Kpi label="今日销售额" value="¥60.00" icon="wallet" foot="含已收 · 0 欠款" delta="+12%" seed={2} />
        <Kpi label="今日订单数" value="1" unit="单" icon="list" tone="warm" foot="客单价 ¥60.00" delta="+1" seed={5} />
        <Kpi label="今日新增客次" value="0" icon="users" tone="info" foot="订单 ¥0.00" delta="0" seed={8} />
        <Kpi label="鲜期批次" value="1" unit="批" icon="box" tone="warn" foot="包含已过期 0 批" delta="1 待入" seed={11} />
      </section>

      <section className="row-2">
        <HomeCard title="即将期到预售单" count="2" action="查看全部">
          {reservations.map((r, i) => (
            <div className="resv-item" key={r.no}>
              <div className={"resv-day " + (i === 1 ? "danger" : "")}><div className="d">{r.d}</div><div className="m">{r.m}</div></div>
              <div className="resv-info">
                <div className="resv-title-line">
                  <span className="resv-no">{r.no}</span>
                  <span className="resv-name">· {r.name}</span>
                  <HomeTag tone={r.tone}>{r.tag}</HomeTag>
                </div>
                <div className="resv-sub">{r.time}</div>
              </div>
              <div className="resv-amt"><div className="amt">{r.amt}</div><div className="stat">待确认</div></div>
            </div>
          ))}
        </HomeCard>

        <HomeCard title="销售趋势 · 7 天" action="详情">
          <div className="chart-frame">
            <svg viewBox="0 0 400 210" width="100%" height="100%" preserveAspectRatio="none">
              <path d="M0 55H400M0 105H400M0 155H400" stroke="rgba(46,58,31,.08)" />
              <path d="M0 150 L65 120 L130 135 L200 92 L265 86 L330 108 L400 154" fill="none" stroke="var(--avo-700)" strokeWidth="3" />
              <path d="M0 150 L65 120 L130 135 L200 92 L265 86 L330 108 L400 154 L400 210 L0 210Z" fill="rgba(168,185,127,.18)" />
            </svg>
          </div>
          <div className="row-3" style={{ marginBottom: 0 }}>
            <div className="stat-block"><div className="lbl">本周累计</div><div className="val">¥3,248.50</div></div>
            <div className="stat-block"><div className="lbl">环比上周</div><div className="val" style={{ color: "var(--ok)" }}>+18.4%</div></div>
            <div className="stat-block"><div className="lbl">客单价</div><div className="val">¥85.20</div></div>
          </div>
        </HomeCard>
      </section>

      <section className="row-2">
        <HomeCard title="今日订单" action="去开单">
          <div className="resv-item">
            <div className="resv-day"><div className="d">26</div><div className="m">04月</div></div>
            <div className="resv-info"><div className="resv-title-line"><span className="resv-no">OR202604260001</span><span className="resv-name">散客</span></div><div className="resv-sub">09:45 · 已付 ¥60.00</div></div>
            <div className="resv-amt"><div className="amt">¥60.00</div></div>
          </div>
        </HomeCard>
        <HomeCard title="临期与过期批次" count="3" action="查看全部">
          {["昆明玫瑰 A级", "白色百合 B级", "尤加利叶"].map((name, i) => (
            <div className="sched-item" key={name}>
              <HomeIcon name="box" className="ico i-lg" />
              <div><div className="name">{name}</div><div className="meta">剩余 {12 - i * 3} 扎 · {i === 0 ? "今天到期" : `${i + 1} 天后过期`}</div></div>
              <div className="qty">{i === 0 ? "临期" : "正常"}</div>
            </div>
          ))}
        </HomeCard>
      </section>
    </main>
  );
}

Object.assign(window, { HomePage });
