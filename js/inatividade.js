// Volta ao início quando ninguém toca na tela por um tempo.
export function iniciarInatividade({ limiteMs = 60000, avisoMs = 10000, aoExpirar, aoAvisar, aoCancelar }) {
  let ultimoToque = Date.now();
  let ativo = false;
  let avisando = false;

  const tocar = () => {
    ultimoToque = Date.now();
    if (avisando) {
      avisando = false;
      aoCancelar?.();
    }
  };
  document.addEventListener('pointerdown', tocar, true);
  document.addEventListener('keydown', tocar, true);

  setInterval(() => {
    if (!ativo) return;
    const restante = limiteMs - (Date.now() - ultimoToque);
    if (restante <= 0) {
      ativo = false;
      avisando = false;
      aoCancelar?.();
      aoExpirar();
    } else if (restante <= avisoMs) {
      avisando = true;
      aoAvisar?.(Math.ceil(restante / 1000));
    }
  }, 250);

  return {
    reiniciar() {
      ativo = true;
      tocar();
    },
    parar() {
      ativo = false;
      if (avisando) {
        avisando = false;
        aoCancelar?.();
      }
    },
  };
}
