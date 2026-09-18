import { decimalWire } from '../../shared/decimalWire'
export default defineNitroPlugin(nitro => {
  nitro.hooks.hook('beforeResponse', (event, response) => {
    if (event.path.startsWith('/api/') && response.body && typeof response.body === 'object') response.body = decimalWire(response.body)
  })
})
