import { businessHandler } from '../../utils/businessTransaction'
import { mutateShift } from '../../utils/operations'
export default businessHandler('shifts/index.post.ts', (tx, actor, key, body, event) => mutateShift(tx, actor, key, body))
