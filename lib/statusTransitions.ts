// Valid status transitions for orders
export const VALID_STATUS_TRANSITIONS = {
  ready_for_delivery: ['scanned', 'in_transit_to_facility'],
  scanned: ['in_transit_to_facility'],
  in_transit_to_facility: ['arrived_at_facility'],
  arrived_at_facility: ['delivered'],
  delivered: [], // Final status
};

export const VALID_PICKUP_STATUSES = ['ready_for_delivery', 'scanned'];
export const VALID_DELIVERY_STATUSES = ['arrived_at_facility'];

export function isValidStatusTransition(fromStatus: string, toStatus: string): boolean {
  const validTransitions = VALID_STATUS_TRANSITIONS[fromStatus as keyof typeof VALID_STATUS_TRANSITIONS];
  return validTransitions ? validTransitions.includes(toStatus) : false;
}

export function getNextValidStatuses(currentStatus: string): string[] {
  return VALID_STATUS_TRANSITIONS[currentStatus as keyof typeof VALID_STATUS_TRANSITIONS] || [];
}

export function canCompletePickup(status: string): boolean {
  return VALID_PICKUP_STATUSES.includes(status);
}

export function canCompleteDelivery(status: string): boolean {
  return VALID_DELIVERY_STATUSES.includes(status);
}
