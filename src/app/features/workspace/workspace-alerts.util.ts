export interface UserAlertCopy {
  eyebrow: string;
  title: string;
  message: string;
}

export const NEW_ORDER_ALERT: UserAlertCopy = {
  eyebrow: 'NUEVO PEDIDO',
  title: 'HAY NUEVOS PEDIDOS',
  message: 'Se han recibido nuevos pedidos. Pulsa Continuar para cerrar este aviso.',
};

export const NEW_OBSERVATION_ALERT: UserAlertCopy = {
  eyebrow: 'OBSERVACIÓN',
  title: 'HAY UNA NUEVA OBSERVACIÓN',
  message: 'Se ha actualizado la observación de una mesa o reservado. Pulsa Continuar para revisarla.',
};
