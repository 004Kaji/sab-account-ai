'use client'

// Shared context that makes the current user's profile available to
// every page inside the (app) route group without prop-drilling.

import { createContext, useContext } from 'react'

export type Profile = {
  id: string
  email: string
  plan: 'free' | 'starter' | 'pro'
  subscription_status: string | null
  trial_ends_at: string | null
  business_name: string | null
}

const defaultProfile: Profile = {
  id: '',
  email: '',
  plan: 'free',
  subscription_status: null,
  trial_ends_at: null,
  business_name: null,
}

export const ProfileContext = createContext<Profile>(defaultProfile)

// useProfile — call this in any page inside (app) to get the current user's data
export function useProfile(): Profile {
  return useContext(ProfileContext)
}
