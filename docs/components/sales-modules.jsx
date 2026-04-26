const { Icon: SalesIcon, Card: SalesCard, Tag: SalesTag, TablePage: SalesTablePage } = window;

function OpenOrderPage() {
  const products = ["红玫瑰花束", "向日葵小束", "白色百合", "尤加利叶", "粉玫瑰", "混搭花篮"];
  return (
    <main className="page">
      <div className="page-head"><div><h1>开单收银</h1><div className="sub">快速选择商品、调整数量并完成收款。</div></div></div>
      <div className="open-layout">
        <SalesCard title="商品选择">
          <div className="product-grid">
            {products.map((p, i) => (
              <div className="product-card" key={p}>
                <div className={"pic " + (i % 3 === 0 ? "rose" : i % 3 === 1 ? "tulip" : "lily")}><SalesIcon name="leaf" /></div>
                <div className="nm">{p}</div><div className="pr">¥{[168, 88, 18, 6, 128, 298][i]}.00</div><div className="stk">库存 {42 + i * 8}</div>
              </div>
            ))}
          </div>
        </SalesCard>
        <div className="cart">
          <div className="cart-head">当前订单</div>
          <div className="cart-body">
            {["红玫瑰花束", "尤加利叶"].map((p, i) => (
              <div className="cart-row" key={p}><span>{p}</span><span className="qty-stepper"><button>-</button><span className="v">{i + 1}</span><button>+</button></span><b>¥{i ? 12 : 168}.00</b></div>
            ))}
          </div>
          <div className="cart-foot"><div className="cart-line"><span>小计</span><span>¥180.00</span></div><div className="cart-line total"><span>应收</span><span>¥180.00</span></div><button className="hero-cta mt-3" style={{ width: "100%", justifyContent: "center" }}>结账收款</button></div>
        </div>
      </div>
    </main>
  );
}

function OrdersPage() {
  return <SalesTablePage title="订单记录" sub="查询历史订单、付款状态与客户挂账。" action="导出" columns={["单号", "日期", "客户", "总金额", "已付", "状态"]} rows={[
    ["OR202604260001", "2026-04-26 09:45", "散客", "¥60.00", "¥60.00", <SalesTag tone="green">已付款</SalesTag>],
    ["OR202604250013", "2026-04-25 18:20", "李娜", "¥168.00", "¥100.00", <SalesTag tone="amber">部分付款</SalesTag>],
  ]} />;
}

function SortPage() {
  const orders = [
    ["09:30", "李娜", "红玫瑰花束", "配送", "未做好"],
    ["11:00", "王华", "混搭花篮", "自提", "加急"],
    ["14:30", "陈小姐", "向日葵小束", "配送", "已做好"],
    ["17:00", "赵先生", "白色百合", "自提", "未做好"],
  ];
  return (
    <main className="page">
      <div className="page-head"><div><h1>订单排单</h1><div className="sub">按履约时间、加急与制作状态排产。</div></div><button className="hero-cta"><SalesIcon name="refresh" /> 刷新排单</button></div>
      <div className="row-3">
        {["全部订单 12", "未做好 7", "加急 2"].map((s, i) => <SalesCard key={s}><div className="stat-block"><div className="lbl">{s.split(" ")[0]}</div><div className="val" style={{ color: i === 1 ? "var(--warn)" : i === 2 ? "var(--danger)" : "var(--ink-900)" }}>{s.split(" ")[1]}</div></div></SalesCard>)}
      </div>
      <div className="sched">
        {orders.map((o, i) => (
          <div className="sched-item" key={i}>
            <SalesIcon name="calendar" className="ico i-lg" />
            <div><div className="name">{o[0]} · {o[1]}</div><div className="meta">{o[2]} · {o[3]}</div></div>
            <div className="qty">{o[4]}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

function PrepPage() {
  return (
    <main className="page">
      <div className="page-head"><div><h1>今日备货</h1><div className="sub">从预售订单自动统计需要准备的花束。</div></div></div>
      <div className="row-3">
        {["订单数 8", "总束数 16", "未做好 7"].map((s, i) => <SalesCard key={s}><div className="stat-block"><div className="lbl">{s.split(" ")[0]}</div><div className="val">{s.split(" ")[1]}</div></div></SalesCard>)}
      </div>
      <SalesCard title="爆款花束排行榜">
        <div className="sched"><div className="sched-item"><SalesIcon name="leaf" className="ico i-lg" /><div><div className="name">红玫瑰花束</div><div className="meta">5 单 · 8 束</div></div><div className="qty">¥840</div></div><div className="sched-item"><SalesIcon name="leaf" className="ico i-lg" /><div><div className="name">向日葵小束</div><div className="meta">3 单 · 5 束</div></div><div className="qty">¥440</div></div></div>
      </SalesCard>
    </main>
  );
}

function PresalePage() {
  return <SalesTablePage title="预售管理" sub="跟踪预售单履约、提醒与打印。" action="新建预售单" columns={["单号", "履约时间", "收货人", "金额", "状态", "提醒"]} rows={[
    ["PU2026042500001", "04-28 23:59", "李娜", "¥4.50", <SalesTag tone="amber">待确认</SalesTag>, "3天后"],
    ["PU2026042600001", "05-01 11:31", "王华", "¥60.00", <SalesTag tone="green">已确认</SalesTag>, "7天内"],
  ]} />;
}

function ReconPage() {
  return <SalesTablePage title="对账单" sub="客户欠款、还款与打印对账。" action="生成对账单" columns={["客户", "期初", "消费", "还款", "期末"]} rows={[["李娜", "¥0.00", "¥168.00", "¥168.00", "¥0.00"], ["王华", "¥120.00", "¥60.00", "¥0.00", "¥180.00"]]} />;
}

Object.assign(window, { OpenOrderPage, OrdersPage, SortPage, PrepPage, PresalePage, ReconPage });
