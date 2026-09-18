import { businessHandler } from '../../../utils/businessTransaction'
import { commitImport } from '../../../utils/dataTransfer'
export default businessHandler('import.commit',(tx,actor,key,b,event)=>commitImport(tx,Number(getRouterParam(event,'id')),actor,key))
