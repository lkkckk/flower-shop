const { Icon: DataIcon, Card: DataCard, Tag: DataTag } = window;

function TablePage({ title, sub, action = "新增", columns = [], rows = [] }) {
  return (
    <main className="page">
      <div className="page-head">
        <div><h1>{title}</h1><div className="sub">{sub}</div></div>
        <button className="hero-cta" style={{ padding: "10px 16px" }}><DataIcon name="plus" /> {action}</button>
      </div>
      <DataCard>
        <div className="toolbar mb-4">
          <div className="topbar-search" style={{ width: 320 }}><DataIcon name="search" /><input placeholder={`搜索${title}`} /></div>
          <div className="flex gap-2"><button className="pager-btn active">全部</button><button className="pager-btn">在售</button><button className="pager-btn">停用</button></div>
        </div>
        <table className="data-table">
          <thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
        </table>
        <div className="pager"><span>共 {rows.length} 条</span><div className="pager-nav"><button className="pager-btn active">1</button><button className="pager-btn">2</button></div></div>
      </DataCard>
    </main>
  );
}

function ProductsPage() {
  return <TablePage title="商品管理" sub="维护花材、花束、价格和单位换算。" action="新增商品" columns={["商品", "分类", "等级", "价格", "库存", "状态"]} rows={[
    ["红玫瑰花束", "花束", <DataTag tone="red">A级</DataTag>, "¥168.00", "32 束", <DataTag tone="green">在售</DataTag>],
    ["白色百合", "鲜切花", <DataTag tone="amber">B级</DataTag>, "¥18.00", "86 枝", <DataTag tone="green">在售</DataTag>],
    ["尤加利叶", "配叶", <DataTag tone="gray">C级</DataTag>, "¥6.00", "120 枝", <DataTag tone="gray">停售</DataTag>],
  ]} />;
}

function CustomersPage() {
  return <TablePage title="客户管理" sub="会员等级、预存余额、欠款与消费记录。" action="新增客户" columns={["姓名", "手机号", "等级", "账户余额", "累计欠款", "积分"]} rows={[
    ["李娜", "138****2026", <DataTag tone="olive">VIP</DataTag>, "预存 ¥560.00", "¥0.00", "280"],
    ["王华", "139****5088", <DataTag tone="amber">批发</DataTag>, "¥0.00", "欠款 ¥120.00", "45"],
    ["陈小姐", "137****9966", <DataTag tone="gray">普通</DataTag>, "¥0.00", "¥0.00", "12"],
  ]} />;
}

function StockPage() {
  return <TablePage title="库存管理" sub="按商品和批次追踪鲜花库存、临期与报损。" action="新增入库" columns={["批次", "商品", "入库日期", "到期", "库存", "状态"]} rows={[
    ["B20260426001", "昆明玫瑰", "04-26", "04-29", "120 / 96 枝", <DataTag tone="amber">临期</DataTag>],
    ["B20260425008", "白色百合", "04-25", "05-02", "80 / 73 枝", <DataTag tone="green">正常</DataTag>],
    ["B20260424003", "尤加利叶", "04-24", "05-01", "60 / 48 枝", <DataTag tone="green">正常</DataTag>],
  ]} />;
}

Object.assign(window, { ProductsPage, CustomersPage, StockPage, TablePage });
