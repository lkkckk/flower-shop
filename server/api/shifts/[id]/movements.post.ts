import { businessHandler } from '../../../utils/businessTransaction'
import { mutateShift } from '../../../utils/operations'
export default businessHandler('shifts/[id]/movements.post.ts', (tx, actor, key, body, event) => mutateShift(tx, actor, key, body, Number(getRouterParam(event, 'id')), 'movement'))
