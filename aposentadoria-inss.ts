// Val Town HTTP val
// Projeção de Aposentadoria - INSS (regras pós-Reforma da Previdência, EC 103/2019)
// POST { idadeAtual, sexo, dataInicioContribuicao, salarioAtual, tempoContribuicaoAnos }

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

    const idadeAtual = Number(body.idadeAtual) || 0;
    const sexo = String(body.sexo || "").toLowerCase(); // "masculino" ou "feminino"
    const salarioAtual = Number(body.salarioAtual) || 0;
    const tempoContribuicaoAnos = Number(body.tempoContribuicaoAnos) || 0;

    if (idadeAtual <= 0 || salarioAtual <= 0 || (sexo !== "masculino" && sexo !== "feminino")) {
      return new Response(
        JSON.stringify({
          error: "idadeAtual, salarioAtual devem ser maiores que zero, e sexo deve ser 'masculino' ou 'feminino'",
        }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Regras gerais pós-reforma (EC 103/2019) - regra permanente por idade mínima
    const idadeMinima = sexo === "masculino" ? 65 : 62;
    const tempoMinimoContribuicao = sexo === "masculino" ? 20 : 15;

    const anosFaltantesIdade = Math.max(idadeMinima - idadeAtual, 0);
    const anosFaltantesContribuicao = Math.max(tempoMinimoContribuicao - tempoContribuicaoAnos, 0);

    // Tempo até se aposentar = o maior entre os dois critérios (precisa cumprir ambos)
    const anosParaAposentar = Math.max(anosFaltantesIdade, anosFaltantesContribuicao);
    const idadeAposentadoria = idadeAtual + anosParaAposentar;
    const tempoContribuicaoNaAposentadoria = tempoContribuicaoAnos + anosParaAposentar;

    // Percentual do benefício: 60% da média salarial + 2% por ano que exceder o tempo mínimo
    // (regra geral simplificada, tempo mínimo = 20 anos homem / 15 anos mulher)
    const anosExcedentes = Math.max(tempoContribuicaoNaAposentadoria - tempoMinimoContribuicao, 0);
    const percentualBeneficio = Math.min(60 + anosExcedentes * 2, 100);

    // Estimativa do valor do benefício (assumindo média salarial = salário atual, simplificação)
    const valorEstimadoBeneficio = salarioAtual * (percentualBeneficio / 100);

    // Teto do INSS 2026 (valor de referência - sujeito a reajuste anual)
    const tetoINSS = 8157.41;
    const valorEstimadoComTeto = Math.min(valorEstimadoBeneficio, tetoINSS);

    return new Response(
      JSON.stringify({
        entrada: { idadeAtual, sexo, salarioAtual, tempoContribuicaoAnos },
        regras: {
          idadeMinima,
          tempoMinimoContribuicaoAnos: tempoMinimoContribuicao,
        },
        resultado: {
          anosParaAposentar: Number(anosParaAposentar.toFixed(1)),
          idadeEstimadaAposentadoria: Number(idadeAposentadoria.toFixed(1)),
          tempoContribuicaoNaAposentadoria: Number(tempoContribuicaoNaAposentadoria.toFixed(1)),
          percentualBeneficio: Number(percentualBeneficio.toFixed(1)),
          valorEstimadoBeneficio: Number(valorEstimadoComTeto.toFixed(2)),
          tetoINSSAplicado: valorEstimadoBeneficio > tetoINSS,
        },
        aviso:
          "Este cálculo é uma estimativa simplificada baseada na regra geral pós-reforma (EC 103/2019) e não considera regras de transição, pontuação (regra 86/96), fator previdenciário ou média salarial completa. Consulte o INSS ou um especialista em previdência.",
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
