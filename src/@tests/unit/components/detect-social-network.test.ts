import { assertEquals } from '@std/assert'
import { detectSocialNetwork } from 'components/SocialLinksInput/detect-social-network.ts'

Deno.test('detectSocialNetwork: recognizes every documented network by hostname', () => {
  assertEquals(detectSocialNetwork('https://instagram.com/zanix'), 'instagram')
  assertEquals(detectSocialNetwork('https://x.com/zanix'), 'x')
  assertEquals(detectSocialNetwork('https://twitter.com/zanix'), 'x')
  assertEquals(detectSocialNetwork('https://facebook.com/zanix'), 'facebook')
  assertEquals(detectSocialNetwork('https://fb.com/zanix'), 'facebook')
  assertEquals(detectSocialNetwork('https://linkedin.com/company/zanix'), 'linkedin')
  assertEquals(detectSocialNetwork('https://tiktok.com/@zanix'), 'tiktok')
  assertEquals(detectSocialNetwork('https://youtube.com/zanix'), 'youtube')
  assertEquals(detectSocialNetwork('https://youtu.be/abc123'), 'youtube')
  assertEquals(detectSocialNetwork('https://wa.me/15551234567'), 'whatsapp')
  assertEquals(detectSocialNetwork('https://whatsapp.com/zanix'), 'whatsapp')
  assertEquals(detectSocialNetwork('https://t.me/zanix'), 'telegram')
  assertEquals(detectSocialNetwork('https://telegram.me/zanix'), 'telegram')
})

Deno.test('detectSocialNetwork: an unrecognized but parseable URL is "website"', () => {
  assertEquals(detectSocialNetwork('https://example.com'), 'website')
})

Deno.test('detectSocialNetwork: empty or unparseable input is null', () => {
  assertEquals(detectSocialNetwork(''), null)
  assertEquals(detectSocialNetwork('   '), null)
  assertEquals(detectSocialNetwork('not a url'), null)
})

Deno.test('detectSocialNetwork: case-insensitive, and strips a leading www.', () => {
  assertEquals(detectSocialNetwork('https://WWW.INSTAGRAM.COM/zanix'), 'instagram')
  assertEquals(detectSocialNetwork('https://www.facebook.com/zanix'), 'facebook')
})

Deno.test('detectSocialNetwork: a subdomain of a recognized domain still matches', () => {
  assertEquals(detectSocialNetwork('https://business.facebook.com/zanix'), 'facebook')
})

Deno.test('detectSocialNetwork: no scheme still parses (a bare "instagram.com/zanix")', () => {
  assertEquals(detectSocialNetwork('instagram.com/zanix'), 'instagram')
})

Deno.test('detectSocialNetwork: re-detects independently on every call, not cached', () => {
  assertEquals(detectSocialNetwork('https://instagram.com/zanix'), 'instagram')
  assertEquals(detectSocialNetwork('https://example.com'), 'website')
  assertEquals(detectSocialNetwork(''), null)
})
