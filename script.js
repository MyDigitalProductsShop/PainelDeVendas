const STORAGE_KEY = 'controle_bicicletas_v3';
const OLD_KEY = 'controle_bicicletas_v2';

let db = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
if (!db) {
  const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
  db = { aprovacoes: [], vendas: [], recebimentos: [] };
  if (old && Array.isArray(old.clientes)) {
    db.vendas = old.clientes.map(c => ({...c, vendedor:c.vendedor||'Não informado', aprovacaoId:null, vendidoEm:c.criadoEm||new Date().toISOString()}));
    db.recebimentos = (old.recebimentos||[]).map(r => ({...r, vendedor:r.vendedor||'Não informado'}));
  }
}
let vendaPagamentoId = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const hojeISO = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const fmtDate = iso => iso ? new Date(iso.slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR') : '-';
const save = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); renderAll(); };
const parseMoney = s => Number(String(s).replace(/[R$\s]/g,'').replace(/\./g,'').replace(',','.')) || 0;
const esc = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function addMonthsISO(iso,n){ const d=new Date(iso+'T12:00:00'); const day=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+n); const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); d.setDate(Math.min(day,last)); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function monthKey(iso){ return iso.slice(0,7); }
function monthLabel(key){ const [y,m]=key.split('-'); return new Date(+y,+m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}); }
function schedule(v){ return Array.from({length:v.parcelas},(_,i)=>({numero:i+1,vencimento:addMonthsISO(v.primeiraParcela,i),valor:v.valorParcela,pago:(v.parcelasPagas||[]).includes(i+1)})); }
function recebidoVenda(v){ return v.entrada + (v.parcelasPagas||[]).length*v.valorParcela; }
function totalVenda(v){ return v.entrada + v.parcelas*v.valorParcela; }
function proximaParcela(v){ return schedule(v).find(p=>!p.pago)||null; }
function concluido(v){ return (v.parcelasPagas||[]).length>=v.parcelas; }
function aprovacaoVendida(a){ return db.vendas.some(v=>v.aprovacaoId===a.id); }

function maskCPF(el){ el.addEventListener('input',e=>{ let v=e.target.value.replace(/\D/g,'').slice(0,11); v=v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'); e.target.value=v; }); }
function moneyInput(el){ el.addEventListener('input',e=>{ const digits=e.target.value.replace(/\D/g,''); e.target.value=digits?money(Number(digits)/100):''; updateSaleSummary(); }); }
maskCPF($('#aCpf')); moneyInput($('#aEntrada')); moneyInput($('#aValorParcela')); moneyInput($('#vEntrada')); moneyInput($('#vValorParcela'));
['#vParcelas','#vBicicletas'].forEach(s=>$(s).addEventListener('input',updateSaleSummary));
$('#vPrimeiraParcela').value=addMonthsISO(hojeISO(),1);

function selecionarStatus(status){ $('#statusEscolhido').value=status; $('#btnAprovar').classList.toggle('selected',status==='aprovado'); $('#btnReprovar').classList.toggle('selected',status==='reprovado'); }
$('#btnAprovar').onclick=()=>selecionarStatus('aprovado');
$('#btnReprovar').onclick=()=>selecionarStatus('reprovado');

$('#aprovacaoForm').addEventListener('submit',e=>{
  e.preventDefault(); const status=$('#statusEscolhido').value; if(!status){alert('Escolha Aprovar ou Reprovar.');return;}
  const a={ id:'a'+Date.now(), nome:$('#aNome').value.trim(), cpf:$('#aCpf').value.trim(), vendedor:$('#aVendedor').value.trim(), bicicletas:+$('#aBicicletas').value, entrada:parseMoney($('#aEntrada').value), parcelas:+$('#aParcelas').value, valorParcela:parseMoney($('#aValorParcela').value), status, criadoEm:new Date().toISOString() };
  db.aprovacoes.push(a); save(); mostrarResultadoAprovacao(a);
  alert(status==='aprovado'?'Cliente aprovado e salvo. Agora você pode registrar a venda na aba Fazer venda.':'Resultado reprovado salvo. Nenhum valor foi lançado no financeiro.');
});

function mostrarResultadoAprovacao(a){ const ok=a.status==='aprovado'; const box=$('#resultadoAprovacao'); box.classList.remove('hidden','result-approved','result-rejected'); box.classList.add(ok?'result-approved':'result-rejected'); $('#resultStatus').innerHTML=`<div class="result-icon">${ok?'✓':'×'}</div><span class="badge ${ok?'ok':'bad'}">${ok?'CLIENTE APROVADO':'CLIENTE REPROVADO'}</span><h2>${ok?'Aprovação concluída':'Simulação reprovada'}</h2><p>${ok?'Cliente liberado na simulação para seguir para a etapa de venda.':'Esta simulação foi marcada como não aprovada.'}</p>`; $('#resultGrid').innerHTML=`<div class="result-item result-item-client"><div class="result-mini-icon">👤</div><div><span>Cliente</span><strong>${esc(a.nome)}</strong></div></div><div class="result-item"><div class="result-mini-icon">▣</div><div><span>CPF</span><strong>${esc(a.cpf)}</strong></div></div><div class="result-item"><div class="result-mini-icon">👨‍💼</div><div><span>Vendedor</span><strong>${esc(a.vendedor)}</strong></div></div><div class="result-item"><div class="result-mini-icon">🚲</div><div><span>Bicicletas aprovadas</span><strong>${a.bicicletas}</strong></div></div><div class="result-item"><div class="result-mini-icon">R$</div><div><span>Entrada aprovada</span><strong>${money(a.entrada)}</strong></div></div><div class="result-item"><div class="result-mini-icon">≡</div><div><span>Parcelamento</span><strong>${a.parcelas}x de ${money(a.valorParcela)}</strong></div></div><div class="result-item result-total"><div class="result-mini-icon">$</div><div><span>Valor total simulado</span><strong>${money(a.entrada+a.parcelas*a.valorParcela)}</strong><small>Entrada + todas as parcelas</small></div></div>`; box.scrollIntoView({behavior:'smooth',block:'start'}); }

$('#btnLimparAprovacao').onclick=()=>{ $('#aprovacaoForm').reset(); $('#aBicicletas').value=1; $('#statusEscolhido').value=''; $('#btnAprovar').classList.remove('selected'); $('#btnReprovar').classList.remove('selected'); $('#resultadoAprovacao').classList.add('hidden'); };

function renderSelectAprovados(){ const sel=$('#vCliente'); const atual=sel.value; const list=db.aprovacoes.filter(a=>a.status==='aprovado'&&!aprovacaoVendida(a)); sel.innerHTML='<option value="">Selecione um cliente aprovado...</option>'+list.map(a=>`<option value="${a.id}">${esc(a.nome)} • ${esc(a.cpf)} • ${esc(a.vendedor)}</option>`).join(''); if(list.some(a=>a.id===atual))sel.value=atual; }

$('#vCliente').addEventListener('change',()=>{ const a=db.aprovacoes.find(x=>x.id===$('#vCliente').value); if(!a){limparCamposVenda(false);return;} $('#vNome').value=a.nome; $('#vCpf').value=a.cpf; $('#vVendedor').value=a.vendedor||''; $('#vBicicletas').value=a.bicicletas; $('#vEntrada').value=money(a.entrada); $('#vParcelas').value=a.parcelas; $('#vValorParcela').value=money(a.valorParcela); $('#vPrimeiraParcela').value=addMonthsISO(hojeISO(),1); updateSaleSummary(); });
function updateSaleSummary(){ const ent=parseMoney($('#vEntrada').value), p=+$('#vParcelas').value||0, vp=parseMoney($('#vValorParcela').value); if(!$('#vCliente').value){$('#saleSummary').textContent='Selecione um cliente aprovado para iniciar a venda.';return;} $('#saleSummary').innerHTML=`<strong>Resumo da venda:</strong> entrada de ${money(ent)} + ${p}x de ${money(vp)} = <strong>${money(ent+p*vp)}</strong>. A entrada será registrada como recebida hoje ao confirmar.`; }

$('#vendaForm').addEventListener('submit',e=>{ e.preventDefault(); const a=db.aprovacoes.find(x=>x.id===$('#vCliente').value); if(!a){alert('Selecione um cliente aprovado.');return;} if(aprovacaoVendida(a)){alert('Este cliente aprovado já foi transformado em venda.');return;} const v={id:'v'+Date.now(), aprovacaoId:a.id, nome:$('#vNome').value.trim(), cpf:$('#vCpf').value.trim(), vendedor:$('#vVendedor').value.trim(), bicicletas:+$('#vBicicletas').value, entrada:parseMoney($('#vEntrada').value), parcelas:+$('#vParcelas').value, valorParcela:parseMoney($('#vValorParcela').value), primeiraParcela:$('#vPrimeiraParcela').value, parcelasPagas:[], vendidoEm:new Date().toISOString()}; db.vendas.push(v); db.recebimentos.push({id:'r'+Date.now(),vendaId:v.id,nome:v.nome,vendedor:v.vendedor,tipo:'Entrada',valor:v.entrada,data:hojeISO(),detalhe:'Entrada da venda'}); save(); alert(`Venda confirmada para ${v.nome}. Entrada de ${money(v.entrada)} registrada.`); limparCamposVenda(true); abrirAba('vendas'); });
function limparCamposVenda(resetSelect=true){ if(resetSelect)$('#vendaForm').reset(); ['#vNome','#vCpf'].forEach(s=>$(s).value=''); $('#vPrimeiraParcela').value=addMonthsISO(hojeISO(),1); $('#saleSummary').textContent='Selecione um cliente aprovado para iniciar a venda.'; if(resetSelect) renderSelectAprovados(); }
$('#btnLimparVenda').onclick=()=>limparCamposVenda(true);

function renderStats(){ const hoje=hojeISO(); const entradasHoje=db.recebimentos.filter(r=>r.data===hoje&&r.tipo==='Entrada').reduce((s,r)=>s+r.valor,0); const parcelasHoje=db.recebimentos.filter(r=>r.data===hoje&&r.tipo==='Parcela').reduce((s,r)=>s+r.valor,0); const totalEntradas=db.recebimentos.filter(r=>r.tipo==='Entrada').reduce((s,r)=>s+r.valor,0); const totalParcelas=db.recebimentos.filter(r=>r.tipo==='Parcela').reduce((s,r)=>s+r.valor,0); const totalGeral=totalEntradas+totalParcelas; const vendasCompletas=db.vendas.filter(concluido).reduce((s,v)=>s+totalVenda(v),0); const aprovadosPendentes=db.aprovacoes.filter(a=>a.status==='aprovado'&&!aprovacaoVendida(a)).length; $('#stats').innerHTML=`<div class="stat"><span>Aprovados aguardando venda</span><strong>${aprovadosPendentes}</strong><small>Ainda não viraram venda</small></div><div class="stat"><span>Entradas recebidas hoje</span><strong>${money(entradasHoje)}</strong><small>Reinicia visualmente à 00:00</small></div><div class="stat"><span>Parcelas recebidas hoje</span><strong>${money(parcelasHoje)}</strong><small>Recebimentos do dia</small></div><div class="stat"><span>Total já recebido</span><strong>${money(totalGeral)}</strong><small>Entradas + parcelas</small></div><div class="stat"><span>Vendas completas</span><strong>${money(vendasCompletas)}</strong><small>Contratos quitados</small></div><div class="stat"><span>Total recebido em entradas</span><strong>${money(totalEntradas)}</strong><small>Histórico acumulado</small></div><div class="stat"><span>Total recebido em parcelas</span><strong>${money(totalParcelas)}</strong><small>Histórico acumulado</small></div><div class="stat"><span>Vendas ativas</span><strong>${db.vendas.filter(v=>!concluido(v)).length}</strong><small>Ainda possuem parcelas</small></div>`; }

function renderAprovados(){ const q=($('#buscaAprovado').value||'').toLowerCase(); const list=db.aprovacoes.filter(a=>a.status==='aprovado'&&`${a.nome} ${a.cpf} ${a.vendedor}`.toLowerCase().includes(q)); $('#aprovadosBody').innerHTML=list.map(a=>{ const vendida=aprovacaoVendida(a); return `<tr><td><strong>${esc(a.nome)}</strong><br><small>${esc(a.cpf)} • ${a.bicicletas} bike(s)</small></td><td>${esc(a.vendedor||'-')}</td><td>${fmtDate(a.criadoEm)}</td><td>${money(a.entrada)} + ${a.parcelas}x ${money(a.valorParcela)}</td><td><span class="badge ${vendida?'ok':'wait'}">${vendida?'VENDA FEITA':'AGUARDANDO VENDA'}</span></td><td><div class="row-actions">${vendida?'':`<button class="btn success" onclick="irParaVenda('${a.id}')">Fazer venda</button>`}<button class="btn danger" onclick="excluirAprovacao('${a.id}')">Excluir</button></div></td></tr>`; }).join('')||'<tr><td colspan="6">Nenhum cliente aprovado encontrado.</td></tr>'; }

function renderVendas(){ const q=($('#buscaVenda').value||'').toLowerCase(); const list=db.vendas.filter(v=>`${v.nome} ${v.cpf} ${v.vendedor}`.toLowerCase().includes(q)); $('#vendasBody').innerHTML=list.map(v=>{ const prox=proximaParcela(v), rec=recebidoVenda(v), falta=Math.max(0,totalVenda(v)-rec), done=concluido(v); return `<tr><td><strong>${esc(v.nome)}</strong><br><small>${esc(v.cpf)} • ${v.bicicletas} bike(s)</small></td><td><strong>${esc(v.vendedor||'-')}</strong></td><td>${money(v.entrada)}</td><td>${v.parcelas}x ${money(v.valorParcela)}</td><td>${prox?`${prox.numero}ª • ${fmtDate(prox.vencimento)}`:'-'}</td><td>${money(rec)}</td><td>${money(falta)}</td><td><span class="badge ${done?'ok':'wait'}">${done?'QUITADO':'ATIVO'}</span></td><td><div class="row-actions">${done?'':`<button class="btn success" onclick="abrirPagamento('${v.id}')">Receber parcela</button>`}<button class="btn secondary" onclick="detalhesVenda('${v.id}')">Detalhes</button><button class="btn danger" onclick="excluirVenda('${v.id}')">Excluir</button></div></td></tr>`; }).join('')||'<tr><td colspan="9">Nenhuma venda confirmada.</td></tr>'; }

function renderMensal(){ const base=new Date(); base.setDate(1); const months=Array.from({length:12},(_,i)=>{const d=new Date(base.getFullYear(),base.getMonth()+i,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}); $('#mensalBody').innerHTML=months.map(m=>{ const pend=[]; db.vendas.forEach(v=>schedule(v).filter(p=>!p.pago&&monthKey(p.vencimento)===m).forEach(p=>pend.push({v,p}))); return `<tr><td><strong>${monthLabel(m)}</strong></td><td>${money(pend.reduce((s,x)=>s+x.p.valor,0))}</td><td>${pend.length} parcela(s)</td><td>${[...new Set(pend.map(x=>x.v.nome))].join(', ')||'-'}</td></tr>`; }).join(''); }
function renderHistorico(){ const lista=[...db.recebimentos].sort((a,b)=>b.data.localeCompare(a.data)||String(b.id).localeCompare(String(a.id))); $('#historicoBody').innerHTML=lista.map(r=>`<tr><td>${fmtDate(r.data)}</td><td>${esc(r.nome)}</td><td>${esc(r.vendedor||'-')}</td><td><span class="badge ${r.tipo==='Entrada'?'wait':'ok'}">${r.tipo}</span></td><td><strong>${money(r.valor)}</strong></td><td>${esc(r.detalhe||'-')}</td></tr>`).join('')||'<tr><td colspan="6">Nenhum recebimento registrado.</td></tr>'; }

window.irParaVenda=id=>{ abrirAba('venda'); renderSelectAprovados(); $('#vCliente').value=id; $('#vCliente').dispatchEvent(new Event('change')); };
window.excluirAprovacao=id=>{ if(aprovacaoVendida(db.aprovacoes.find(a=>a.id===id))){alert('Esta aprovação já possui uma venda vinculada. Exclua a venda primeiro.');return;} if(confirm('Excluir esta aprovação?')){db.aprovacoes=db.aprovacoes.filter(a=>a.id!==id);save();} };
window.abrirPagamento=id=>{ const v=db.vendas.find(x=>x.id===id); if(!v)return; const p=proximaParcela(v); if(!p)return; vendaPagamentoId=id; $('#dataPagamento').value=hojeISO(); $('#pagamentoInfo').textContent=`${v.nome} • Vendedor: ${v.vendedor||'-'} • ${p.numero}ª parcela • ${money(p.valor)} • vencimento ${fmtDate(p.vencimento)}`; $('#modalPagamento').classList.remove('hidden'); };
$('#cancelarPagamento').onclick=()=>$('#modalPagamento').classList.add('hidden');
$('#confirmarPagamento').onclick=()=>{ const v=db.vendas.find(x=>x.id===vendaPagamentoId); if(!v)return; const p=proximaParcela(v); if(!p)return; const data=$('#dataPagamento').value||hojeISO(); v.parcelasPagas=v.parcelasPagas||[]; v.parcelasPagas.push(p.numero); db.recebimentos.push({id:'r'+Date.now(),vendaId:v.id,nome:v.nome,vendedor:v.vendedor,tipo:'Parcela',valor:v.valorParcela,data,detalhe:`${p.numero}ª de ${v.parcelas} parcelas`}); $('#modalPagamento').classList.add('hidden'); save(); };
window.detalhesVenda=id=>{ const v=db.vendas.find(x=>x.id===id); if(!v)return; const linhas=schedule(v).map(p=>`${p.numero}ª - ${fmtDate(p.vencimento)} - ${money(p.valor)} - ${p.pago?'PAGA':'PENDENTE'}`).join('\n'); alert(`${v.nome}\nCPF: ${v.cpf}\nVendedor: ${v.vendedor||'-'}\nEntrada: ${money(v.entrada)}\nTotal da venda: ${money(totalVenda(v))}\n\nPARCELAS:\n${linhas}`); };
window.excluirVenda=id=>{ if(!confirm('Excluir esta venda? Os recebimentos já registrados permanecerão no histórico.'))return; db.vendas=db.vendas.filter(v=>v.id!==id); save(); };

function renderAll(){ renderStats(); renderSelectAprovados(); renderAprovados(); renderVendas(); renderMensal(); renderHistorico(); }
function abrirAba(nome){ $$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===nome)); $$('.panel').forEach(x=>x.classList.toggle('active',x.id==='tab-'+nome)); window.scrollTo({top:0,behavior:'smooth'}); }
$$('.tab').forEach(btn=>btn.onclick=()=>abrirAba(btn.dataset.tab));
$('#buscaAprovado').addEventListener('input',renderAprovados); $('#buscaVenda').addEventListener('input',renderVendas);
$('#btnExportar').onclick=()=>{ const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`backup-aprovacoes-vendas-${hojeISO()}.json`; a.click(); URL.revokeObjectURL(a.href); };

save();
setInterval(renderStats,60000);
