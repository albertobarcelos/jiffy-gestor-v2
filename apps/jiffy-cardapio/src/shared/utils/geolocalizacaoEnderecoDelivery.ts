export type {
  EnderecoGeocodeInput,
  EnderecoLocalizacaoInput,
  GeocodeEnderecoResult,
} from '@/src/shared/utils/geolocalizacaoEnderecoShared'
export {
  coordsPointsDiferem,
  enderecoGeocodeMinimo,
  geocodificarEnderecoViaGoogle,
  mesclarEnderecoComReverseGeocode,
  montarEnderecoLocalizacaoInput,
  montarEnderecoParaGeocode,
  montarParametrosGeocodeEndereco,
  montarPayloadGeoEnderecoDelivery,
  normalizarCepEndereco,
  resolverEnderecoPorCoordenadas,
  resolverPreferenciaEntrega,
} from '@/src/shared/utils/geolocalizacaoEnderecoShared'
export { enderecoEntregaTemGeolocalizacao as enderecoTemGeolocalizacao } from '@/src/domain/policies/EnderecoEntregaRequerGeolocalizacao'
