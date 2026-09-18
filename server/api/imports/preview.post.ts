import { businessHandler } from '../../utils/businessTransaction'
import { validateImport } from '../../utils/dataTransfer'
export default businessHandler('import.preview',(tx,actor,key,b)=>validateImport(tx,b.kind,b.csv,actor))
