const { Icon } = window;

const navGroups = [
  { label: "主要工作台", items: [
    ["home", "home", "首页"],
    ["closing", "chart", "每日复盘"],
  ]},
  { label: "销售", items: [
    ["open", "cart", "开单收银"],
    ["orders", "list", "订单记录", "12"],
    ["sort", "calendar", "订单排单"],
    ["prep", "truck", "今日备货"],
    ["presale", "calendar", "预售管理", "2"],
    ["presale_detail", "list", "预售单详情"],
  ]},
  { label: "客户与商品", items: [
    ["products", "box", "商品管理"],
    ["customers", "users", "客户管理"],
    ["customer_detail", "users", "客户详情"],
  ]},
  { label: "库存", items: [
    ["stock", "box", "库存管理"],
    ["inbound", "box", "入库登记"],
    ["stocktake", "box", "库存盘点"],
    ["movements", "list", "库存流水"],
    ["restock", "truck", "采购建议"],
    ["pricing", "wallet", "价格策略"],
  ]},
  { label: "经营", items: [
    ["recon", "wallet", "对账单"],
    ["report", "chart", "报表"],
    ["settings", "list", "系统设置"],
  ]},
];

function Sidebar({ active, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><Icon name="leaf" /></div>
        <div>
          <div className="brand-name">花店管理</div>
          <div className="brand-sub">Avocado · v2.4</div>
        </div>
      </div>
      {navGroups.map(group => (
        <div key={group.label}>
          <div className="nav-section-label">{group.label}</div>
          {group.items.map(([key, icon, label, badge]) => (
            <div
              key={key}
              className={"nav-item " + (active === key ? "active" : "")}
              role="button"
              tabIndex="0"
              onClick={() => onSelect(key)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(key); }}
            >
              <span className="nav-icon"><Icon name={icon} /></span>
              <span>{label}</span>
              {badge && <span className="nav-badge">{badge}</span>}
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}

function Topbar({ crumb }) {
  return (
    <header className="topbar">
      <div className="crumb">
        <Icon name="home" />
        <span>{crumb[0]}</span>
        <span className="sep">/</span>
        <span className="now">{crumb[1]}</span>
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-search">
        <Icon name="search" />
        <input placeholder="搜索订单、客户、商品..." />
      </div>
      <button className="topbar-icon-btn"><Icon name="bell" /><span className="dot" /></button>
      <button className="topbar-icon-btn"><Icon name="refresh" /></button>
      <button className="topbar-user">
        <span className="avatar">管</span>
        <span className="name">管理员</span>
        <span>⌄</span>
      </button>
    </header>
  );
}

Object.assign(window, { Sidebar, Topbar });
