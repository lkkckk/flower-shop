function Icon({ name, className = "i" }) {
  const paths = {
    leaf: "M6 18C4 12 7 6 18 4c-1 9-6 14-12 14Zm0 0c4-5 7-8 12-10",
    home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3V10.5Z",
    cart: "M4 5h2l2 10h9l2-7H7M9 20h.01M17 20h.01",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    calendar: "M7 3v4M17 3v4M4 8h16M5 5h14v16H5z",
    truck: "M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 20h.01M17 20h.01",
    box: "M21 8 12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    chart: "M4 19V5M4 19h16M8 16v-5M13 16V8M18 16v-8",
    plus: "M12 5v14M5 12h14",
    search: "M21 21 16.7 16.7M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
    refresh: "M21 12a9 9 0 0 1-15 6.7M3 12a9 9 0 0 1 15-6.7M18 2v5h-5M6 22v-5h5",
    wallet: "M3 7h18v13H3zM16 12h5M3 7l3-4h12l3 4",
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] || paths.leaf} />
    </svg>
  );
}

function Tag({ tone = "gray", children }) {
  return <span className={"tag " + tone}>{children}</span>;
}

function Card({ title, count, action, children, className = "" }) {
  return (
    <section className={"card " + className}>
      {title && (
        <div className="card-head">
          <div className="card-title">{title}{count != null && <span className="count">{count}</span>}</div>
          {action && <button className="card-action">{action} ›</button>}
        </div>
      )}
      {children}
    </section>
  );
}

function Spark({ seed = 1 }) {
  const points = [14, 24, 12, 29, 36, 22, 33, 19].map((v, i) => Math.max(8, (v + seed * i) % 38));
  return <div className="kpi-spark">{points.map((h, i) => <i key={i} style={{ height: h }} />)}</div>;
}

Object.assign(window, { Icon, Tag, Card, Spark });
