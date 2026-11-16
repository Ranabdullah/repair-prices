'use strict';
const quote=document.createElement('dialog');
quote.style.cssText='border:0;border-radius:16px;padding:22px;max-width:460px;width:calc(100% - 32px)';
quote.innerHTML='<form id="quoteForm"><h2>Repair quote calculator</h2><p>Uses the tax and overhead in Pricing assumptions.</p><label>Part cost (€) <input name="cost" min="0" type="number" step=".01" required></label><br><label>Selling price (€) <input name="price" min=".01" type="number" step=".01" required></label><p id="quoteResult" role="status"></p><button type="button" data-close>Close</button> <button>Calculate</button></form>';
document.body.append(quote);
const quoteButton=document.createElement('button');
quoteButton.id='openQuote';
quoteButton.textContent='Quote calculator';
quoteButton.style.cssText=document.getElementById('buyerPricingButton').style.cssText;
document.getElementById('buyerPricingButton').before(quoteButton);
quoteButton.onclick=()=>quote.showModal();
quote.querySelector('[data-close]').onclick=()=>quote.close();
quote.querySelector('form').onsubmit=event=>{
  event.preventDefault();
  const {cost,price}=Object.fromEntries(new FormData(event.currentTarget));
  const profit=calcProfit(Number(price),Number(cost));
  const currency=new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'});
  quote.querySelector('#quoteResult').textContent='Estimated profit '+currency.format(profit)+' · Margin '+(profit/Number(price)*100).toFixed(1)+'%';
};
