// Val Town HTTP val
// Calculadora de Horas Extras - CLT
// POST { salarioBase, horasExtras50, horasExtras100, horasAdicionalNoturno, diasDomingoFeriado, jornadaMensal }

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

    const salarioBase = Number(body.salarioBase) || 0;
    const horasExtras50 = Number(body.horasExtras50) || 0;
    const horasExtras100 = Number(body.horasExtras100) || 0;
    const horasAdicionalNoturno = Number(body.horasAdicionalNoturno) || 0;
    const diasDomingoFeriado = Number(body.diasDomingoFeriado) || 0;
    const jornadaMensal = Number(body.jornadaMensal) || 220; // padrão CLT

    if (salarioBase <= 0) {
      return new Response(JSON.stringify({ error: "salarioBase deve ser maior que zero" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Valor da hora normal
    const valorHoraNormal = salarioBase / jornadaMensal;

    // Horas extras 50%
    const valorHora50 = valorHoraNormal * 1.5;
    const totalHoras50 = valorHora50 * horasExtras50;

    // Horas extras 100% (domingos/feriados trabalhados)
    const valorHora100 = valorHoraNormal * 2;
    const totalHoras100 = valorHora100 * horasExtras100;

    // Adicional noturno (20% sobre a hora normal, aplicado às horas em período noturno)
    const percentualAdicionalNoturno = 0.2;
    const valorHoraNoturna = valorHoraNormal * percentualAdicionalNoturno;
    const totalAdicionalNoturno = valorHoraNoturna * horasAdicionalNoturno;

    // Total de horas extras (base para cálculo do DSR)
    const totalHorasExtras = totalHoras50 + totalHoras100 + totalAdicionalNoturno;

    // Reflexo no DSR (Descanso Semanal Remunerado)
    // Fórmula simplificada: (total horas extras / dias úteis no mês) * dias de descanso (domingos + feriados)
    const diasUteisMes = 25; // aproximação padrão
    const diasDescanso = diasDomingoFeriado > 0 ? diasDomingoFeriado : 4; // 4 domingos como padrão se não informado
    const reflexoDSR = (totalHorasExtras / diasUteisMes) * diasDescanso;

    const totalGeral = totalHorasExtras + reflexoDSR;

    return new Response(
      JSON.stringify({
        entrada: {
          salarioBase,
          jornadaMensal,
          horasExtras50,
          horasExtras100,
          horasAdicionalNoturno,
          diasDomingoFeriado,
        },
        resultado: {
          valorHoraNormal: Number(valorHoraNormal.toFixed(2)),
          valorHora50: Number(valorHora50.toFixed(2)),
          totalHoras50: Number(totalHoras50.toFixed(2)),
          valorHora100: Number(valorHora100.toFixed(2)),
          totalHoras100: Number(totalHoras100.toFixed(2)),
          totalAdicionalNoturno: Number(totalAdicionalNoturno.toFixed(2)),
          totalHorasExtras: Number(totalHorasExtras.toFixed(2)),
          reflexoDSR: Number(reflexoDSR.toFixed(2)),
          totalGeral: Number(totalGeral.toFixed(2)),
        },
        aviso: "Este cálculo é uma estimativa. Consulte um contador ou advogado trabalhista.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro ao processar requisição", detalhe: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
