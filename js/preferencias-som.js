// Preferências de som salvas no aparelho (mudo, volume e música de fundo).
export const CHAVE_SOM = 'simulador-bolsa:som';
export const PADRAO_SOM = { mudo: false, volume: 0.7, musica: false };

export function carregarPreferenciasSom(storage) {
  try {
    const dados = JSON.parse(storage.getItem(CHAVE_SOM)) ?? {};
    return {
      mudo: typeof dados.mudo === 'boolean' ? dados.mudo : PADRAO_SOM.mudo,
      volume: typeof dados.volume === 'number' ? Math.min(1, Math.max(0, dados.volume)) : PADRAO_SOM.volume,
      musica: typeof dados.musica === 'boolean' ? dados.musica : PADRAO_SOM.musica,
    };
  } catch {
    return { ...PADRAO_SOM };
  }
}

export function salvarPreferenciasSom(storage, preferencias) {
  try {
    storage.setItem(CHAVE_SOM, JSON.stringify(preferencias));
    return true;
  } catch {
    return false;
  }
}
