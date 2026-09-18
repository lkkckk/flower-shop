import { businessHandler } from '../../../utils/businessTransaction'
import { mutateShift } from '../../../utils/operations'
export default businessHandler('shifts/[id]/reopen.post.ts', (tx, actor, key, body, event) => mutateShift(tx, actor, key, body, Number(getRouterParam(event, 'id')), 'reopen'))
