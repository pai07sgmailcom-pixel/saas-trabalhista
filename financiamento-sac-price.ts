// Val Town HTTP val
// Comparador de Financiamento - SAC x Price
// POST { valorFinanciado, taxaJurosMensal, numeroParcelas }

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const body = await req.json();

    const valorFinanciado = Number(body.valorFinanciado) || 0;
    const taxaJurosMensal = Number(body.taxaJurosMensal) || 0; // em % (ex: 1.5 = 1.5%)
    const numeroParcelas = Number(body.numeroParcelas) || 0;

    if (valorFinanciado <= 0 || taxaJurosMensal <= 0 || numeroParcelas <= 0) {
      return new Response(
        JSON.stringify({ error: "valorFinanciado, taxaJurosMensal e numeroParcelas devem ser maiores que zero" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const i = taxaJurosMensal / 100; // taxa decimal

    // ---------- SAC (Sistema de Amortização Constante) ----------
    const amortizacaoConstante = valorFinanciado / numeroParcelas;
    const parcelasSAC = [];
    let saldoDevedorSAC = valorFinanciado;
    let totalPagoSAC = 0;
    let totalJurosSAC = 0;

    for (let mes = 1; mes <= numeroParcelas; mes++) {
      const juros = saldoDevedorSAC * i;
      const parcela = amortizacaoConstante + juros;
      saldoDevedorSAC -= amortizacaoConstante;
      totalPagoSAC += parcela;
      totalJurosSAC += juros;

      parcelasSAC.push({
        mes,
        parcela: Number(parcela.toFixed(2)),
        amortizacao: Number(amortizacaoConstante.toFixed(2)),
        juros: Number(juros.toFixed(2)),
        saldoDevedor: Number(Math.max(saldoDevedorSAC, 0).toFixed(2)),
      });
    }

    // ---------- Price (Tabela Price / parcelas fixas) ----------
    const parcelaFixaPrice =
      (valorFinanciado * i * Math.pow(1 + i, numeroParcelas)) / (Math.pow(1 + i, numeroParcelas) - 1);

    const parcelasPrice = [];
    let saldoDevedorPrice = valorFinanciado;
    let totalPagoPrice = 0;
    let totalJurosPrice = 0;

    for (let mes = 1; mes <= numeroParcelas; mes++) {
      const juros = saldoDevedorPrice * i;
      const amortizacao = parcelaFixaPrice - juros;
      saldoDevedorPrice -= amortizacao;
      totalPagoPrice += parcelaFixaPrice;
      totalJurosPrice += juros;

      parcelasPrice.push({
        mes,
        parcela: Number(parcelaFixaPrice.toFixed(2)),
        amortizacao: Number(amortizacao.toFixed(2)),
        juros: Number(juros.toFixed(2)),
        saldoDevedor: Number(Math.max(saldoDevedorPrice, 0).toFixed(2)),
      });
    }

    return new Response(
      JSON.stringify({
        entrada: { valorFinanciado, taxaJurosMensal, numeroParcelas },
        sac: {
          primeiraParcela: parcelasSAC[0].parcela,
          ultimaParcela: parcelasSAC[parcelasSAC.length - 1].parcela,
          totalPago: Number(totalPagoSAC.toFixed(2)),
          totalJuros: Number(totalJurosSAC.toFixed(2)),
          parcelas: parcelasSAC,
        },
        price: {
          parcelaFixa: Number(parcelaFixaPrice.toFixed(2)),
          totalPago: Number(totalPagoPrice.toFixed(2)),
          totalJuros: Number(totalJurosPrice.toFixed(2)),
          parcelas: parcelasPrice,
        },
        comparacao: {
          diferencaTotalPago: Number((totalPagoPrice - totalPagoSAC).toFixed(2)),
          diferencaTotalJuros: Number((totalJurosPrice - totalJurosSAC).toFixed(2)),
          maisBarato: totalPagoSAC <= totalPagoPrice ? "SAC" : "Price",
        },
        aviso: "Este cálculo é uma estimativa. Consulte sua instituição financeira para condições reais do contrato.",
      }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro ao processar requisição", detalhe: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
