import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'

function req(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/chat', { headers })
}

function basic(user: string, pass: string) {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
}

describe('proxy: Basic Auth gate', () => {
  beforeEach(() => {
    process.env.GATE_USER = 'vik'
    process.env.GATE_PASS = 's3cret'
  })
  afterEach(() => {
    delete process.env.GATE_USER
    delete process.env.GATE_PASS
  })

  it('should challenge with 401 when no credentials are provided', () => {
    const res = proxy(req())
    expect(res.status).toBe(401)
    expect(res.headers.get('WWW-Authenticate')).toMatch(/Basic/)
  })

  it('should allow the request when credentials match', () => {
    const res = proxy(req({ authorization: basic('vik', 's3cret') }))
    expect(res.status).not.toBe(401)
  })

  it('should challenge with 401 when credentials are wrong', () => {
    const res = proxy(req({ authorization: basic('vik', 'wrong') }))
    expect(res.status).toBe(401)
  })
})

describe('proxy: gate disabled when unconfigured', () => {
  beforeEach(() => {
    delete process.env.GATE_USER
    delete process.env.GATE_PASS
  })

  it('should allow all requests when no gate credentials are set', () => {
    const res = proxy(req())
    expect(res.status).not.toBe(401)
  })
})
