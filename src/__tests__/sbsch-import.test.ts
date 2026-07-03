import { describe, it, expect } from 'vitest'
import { parseSbschCsv } from '@/lib/sbsch-import'

describe('parseSbschCsv', () => {
  it('parses APRA fund rows with aliased headers', () => {
    const csv = [
      'Employee Name,Email,Super Fund Name,USI,Member Number',
      'Alice Smith,alice@x.com,AustralianSuper,STA0100AU,12345',
    ].join('\n')
    const { rows, errors } = parseSbschCsv(csv)
    expect(errors).toHaveLength(0)
    expect(rows[0]).toMatchObject({
      name: 'Alice Smith',
      email: 'alice@x.com',
      super_fund_name: 'AustralianSuper',
      usi: 'STA0100AU',
      member_number: '12345',
      is_smsf: false,
    })
    expect(rows[0].warnings).toHaveLength(0)
  })

  it('joins Given Name + Family Name when no single Name column', () => {
    const csv = 'Given Name,Family Name,USI\nBob,Jones,STA0100AU'
    const { rows } = parseSbschCsv(csv)
    expect(rows[0].name).toBe('Bob Jones')
  })

  it('detects SMSF via fund type / ESA and captures bank fields', () => {
    const csv = [
      'Name,Fund Type,ESA,BSB,Account Number',
      'Carol Lee,SMSF,SMSFDATAFLOW,062000,12345678',
    ].join('\n')
    const { rows } = parseSbschCsv(csv)
    expect(rows[0]).toMatchObject({ is_smsf: true, smsf_esa: 'SMSFDATAFLOW', smsf_bank_bsb: '062000', smsf_bank_acct: '12345678' })
  })

  it('warns on an invalid USI and a missing USI for APRA funds', () => {
    const csv = 'Name,Super Fund,USI\nDan,AustralianSuper,\nEve,Hostplus,!!bad!!'
    const { rows } = parseSbschCsv(csv)
    expect(rows[0].warnings.join()).toMatch(/No USI/)
    expect(rows[1].warnings.join()).toMatch(/valid/)
  })

  it('handles quoted fields containing commas', () => {
    const csv = 'Name,Super Fund Name,USI\n"Smith, John","Fund, Inc",STA0100AU'
    const { rows } = parseSbschCsv(csv)
    expect(rows[0].name).toBe('Smith, John')
    expect(rows[0].super_fund_name).toBe('Fund, Inc')
  })

  it('errors when there is no name column', () => {
    const { errors } = parseSbschCsv('Fund,USI\nAustralianSuper,STA0100AU')
    expect(errors[0]).toMatch(/name column/)
  })
})
