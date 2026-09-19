async (page) => {
  const origin = await page.evaluate(()=>location.origin);
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  await page.locator('iframe.receipt-preview').waitFor();
  const preview = page.frameLocator('iframe.receipt-preview');
  await preview.getByText('¥396.50', {exact:true}).waitFor();
  check(await preview.locator('img').count() === 0, '热敏小票不应含照片');
  for (const width of [375,768,1440]) {
    await page.setViewportSize({width,height:900});
    for (const paper of ['58','80']) {
      await page.getByLabel('小票纸宽').selectOption(paper);
      await preview.getByText('¥396.50',{exact:true}).waitFor();
      check(!await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth+1),'小票页面溢出');
      const dimensions = await preview.locator('.receipt').evaluate(el=>({width:el.getBoundingClientRect().width,box:getComputedStyle(el).boxSizing,align:getComputedStyle(el.querySelector('.shop-name')).textAlign}));
      check(Math.abs(dimensions.width - Number(paper)*96/25.4)<1 && dimensions.box==='border-box' && dimensions.align==='center','纸宽或店名对齐错误');
      await page.screenshot({path:`output/playwright/preorder-receipt-${width}-${paper}.png`,fullPage:true});
    }
  }
  await page.reload();
  check(await page.getByLabel('小票纸宽').inputValue()==='80','纸宽未持久化');
  await page.goto(origin+'/preorders/registrations/3/receipt');
  await page.frameLocator('iframe.receipt-preview').getByText('旧记录花束',{exact:true}).waitFor();
  check(!(await page.frameLocator('iframe.receipt-preview').locator('body').innerText()).includes('¥0.00'),'历史金额误显示为零');
  await page.goto(origin+'/preorders/registrations/4/delivery-slip');
  await page.getByRole('button',{name:'立即打印配送单'}).waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('立即打印配送单')&&!b.disabled));
  check(await page.locator('.order-total').count()===1,'照片重复累计总额');
  check((await page.locator('.order-total').innerText()).includes('396.50'),'A4总额错误');
  check(await page.locator('img').count()>=2,'A4照片丢失');
  await page.pdf({path:'output/playwright/printing-delivery-slip.pdf',format:'A4',printBackground:true,preferCSSPageSize:true});
  await page.screenshot({path:'output/playwright/printing-delivery-slip.png',fullPage:true});
  await page.goto(origin+'/orders/1/print');
  await page.frameLocator('iframe.receipt-preview').getByText('打印验收月季',{exact:true}).waitFor();
  console.log('PASS 375/768/1440 × 58/80mm、纸宽持久化、历史未知、A4照片和单次合计、销售小票');
}
