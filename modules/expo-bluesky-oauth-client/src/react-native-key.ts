import {
  jwkValidator,
  Jwt,
  JwtHeader,
  JwtPayload,
  jwtPayloadSchema,
  Key,
  VerifyOptions,
  VerifyPayload,
  VerifyResult,
} from '@atproto/jwk'

import {OauthClientReactNative} from './oauth-client-react-native'

export class ReactNativeKey extends Key {
  static async generate(kid: string, allowedAlgos: string[]) {
    for (const algo of allowedAlgos) {
      try {
        // Note: OauthClientReactNative.generatePrivateJwk should throw if it
        // doesn't support the algorithm.
        const res = await OauthClientReactNative.generateJwk(algo)
        const jwk = JSON.parse(res.privateKey) as Record<string, unknown>
        const use = jwk.use || 'sig'
        return new ReactNativeKey(jwkValidator.parse({...jwk, use, kid}))
      } catch {
        // Ignore, try next one
      }
    }

    throw new Error('No supported algorithms')
  }

  async createJwt(header: JwtHeader, payload: JwtPayload): Promise<Jwt> {
    return await OauthClientReactNative.createJwt(
      JSON.stringify(header),
      JSON.stringify(payload),
      JSON.stringify(this.jwk),
    )
  }

  async verifyJwt<
    P extends VerifyPayload = JwtPayload,
    C extends string = string,
  >(token: Jwt, options?: VerifyOptions<C>): Promise<VerifyResult<P, C>> {
    const result = await OauthClientReactNative.verifyJwt(token, this.jwk)

    let payloadParsed = JSON.parse(result.payload)
    const payload = jwtPayloadSchema.parse(payloadParsed)

    let protectedHeaderParsed = JSON.parse(result.protectedHeader)
    const protectedHeader = jwtPayloadSchema.parse(protectedHeaderParsed)

    if (options?.audience != null) {
      const audience = Array.isArray(options.audience)
        ? options.audience
        : [options.audience]
      if (!audience.includes(payload.aud)) {
        throw new Error('Invalid audience')
      }
    }

    if (options?.issuer != null) {
      const issuer = Array.isArray(options.issuer)
        ? options.issuer
        : [options.issuer]
      if (!issuer.includes(payload.iss)) {
        throw new Error('Invalid issuer')
      }
    }

    if (options?.subject != null && payload.sub !== options.subject) {
      throw new Error('Invalid subject')
    }

    if (options?.typ != null && protectedHeader.typ !== options.typ) {
      throw new Error('Invalid type')
    }

    if (options?.requiredClaims != null) {
      for (const key of options.requiredClaims) {
        if (
          !Object.hasOwn(payload, key) ||
          (payload as Record<string, unknown>)[key] === undefined
        ) {
          throw new Error(`Missing claim: ${key}`)
        }
      }
    }

    console.log(payload)

    if (payload.iat == null) {
      throw new Error('Missing issued at')
    }

    const now = (options?.currentDate?.getTime() ?? Date.now()) / 1e3
    const clockTolerance = options?.clockTolerance ?? 0

    if (options?.maxTokenAge != null) {
      if (payload.iat < now - options.maxTokenAge + clockTolerance) {
        throw new Error('Invalid issued at')
      }
    }

    if (payload.nbf != null) {
      if (payload.nbf > now - clockTolerance) {
        throw new Error('Invalid not before')
      }
    }

    if (payload.exp != null) {
      if (payload.exp < now + clockTolerance) {
        throw new Error('Invalid expiration')
      }
    }

    return {payload, protectedHeader} as VerifyResult<P, C>
  }
}
