const { Icon: AdminIcon, Card: AdminCard, Tag: AdminTag, TablePage: AdminTablePage } = window;

function ReportPage() {
  return (
    <main className="page">
      <div className="page-head"><div><h1>经营报表</h1><div className="sub">销售、毛利、支付方式和畅销榜。</div></div></div>
      <section className="kpi-grid">
        {["销售额 ¥3,248.50", "订单数 38", "毛利率 42%", "客单价 ¥85.20"].map((s, i) => <div className="kpi" key={s}><div className="kpi-head"><div className="kpi-label">{s.split(" ")[0]}</div><div className="kpi-icon"><AdminIcon name="chart" /></div></div><div className="kpi-value">{s.split(" ")[1]}</div></div>)}
      </section>
      <AdminCard title="销售趋势">
        <div className="chart-frame"><svg viewBox="0 0 600 220" width="100%" height="100%" preserveAspectRatio="none"><path d="M0 160 L100 130 L200 150 L300 88 L420 94 L520 120 L600 76" fill="none" stroke="var(--avo-700)" strokeWidth="4" /><path d="M0 160 L100 130 L200 150 L300 88 L420 94 L520 120 L600 76 L600 220 L0 220Z" fill="rgba(168,185,127,.18)" /></svg></div>
      </AdminCard>
    </main>
  );
}

function SettingsPage() {
  return (
    <main className="page">
      <div className="page-head"><div><h1>系统设置</h1><div className="sub">基础设置、活动规则和账号权限。</div></div></div>
      <AdminCard>
        {["店铺名称", "默认保鲜天数", "低库存提醒", "打印模板"].map((label, i) => (
          <div className="form-row" key={label}>
            <div className="form-label">{label}<span className="desc">用于后台展示和业务默认值。</span></div>
            <input className="input-text" defaultValue={["花店管理", "3", "10", "标准小票"][i]} />
          </div>
        ))}
      </AdminCard>
    </main>
  );
}

function ClosingPage() {
  return <AdminTablePage title="每日复盘" sub="汇总当天销售、库存异常和客户欠款。" action="导出复盘" columns={["项目", "今日", "昨日", "变化"]} rows={[["销售额", "¥3,248.50", "¥2,744.00", "+18.4%"], ["订单数", "38", "31", "+7"], ["新增欠款", "¥120.00", "¥80.00", "+¥40"]]} />;
}

Object.assign(window, { ReportPage, SettingsPage, ClosingPage });
