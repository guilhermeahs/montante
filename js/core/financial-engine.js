export const example = Object.freeze({ initial: 1000, contribution: 500, rate: 0.8, months: 60 });
export const projectionLimit = 1e13;

export function project({ initial, contribution, rate, months }) {
  if (![initial, contribution].every(value =>
    Number.isFinite(value) && value >= 0 && value <= 1e8 && Number(value.toFixed(2)) === value
  )) {
    throw new RangeError('Informe valores entre R$ 0 e R$ 100 milhões, com até duas casas decimais.');
  }
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new RangeError('Informe uma taxa mensal equivalente entre 0% e 100%.');
  }
  if (!Number.isInteger(months) || months < 1 || months > 600) {
    throw new RangeError('Informe um prazo inteiro de 1 a 600 meses.');
  }

  const series = [{ month: 0, opening: initial, deposit: 0, yield: 0, balance: initial, invested: initial, interest: 0, simple: initial }];
  const monthlyRate = rate / 100;
  let balance = initial;
  for (let month = 1; month <= months; month++) {
    const opening = balance;
    const earned = opening * monthlyRate;
    balance = opening + earned + contribution;
    if (!Number.isFinite(balance) || balance > projectionLimit) {
      throw new RangeError('A projeção excede R$ 10 trilhões. Reduza o prazo, a taxa ou os valores.');
    }
    const invested = initial + contribution * month;
    const simple = invested + monthlyRate * (initial * month + contribution * month * (month - 1) / 2);
    series.push({ month, opening, deposit: contribution, yield: earned, balance, invested, interest: balance - invested, simple });
  }
  const final = series.at(-1);
  return { ...final, returnPercent: final.invested ? final.interest / final.invested * 100 : null, series };
}

export function monthlyFromAnnual(percent) {
  return Math.expm1(Math.log1p(percent / 100) / 12) * 100;
}

export function annualFromMonthly(percent) {
  return Math.expm1(12 * Math.log1p(percent / 100)) * 100;
}
