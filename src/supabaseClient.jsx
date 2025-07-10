// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ophwncotptfhnrdxgwmw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9waHduY290cHRmaG5yZHhnd213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyOTQzNTcsImV4cCI6MjA2Njg3MDM1N30.xgi93SgpZEZxBF1XEvMctCh27RmnAdwcuYGDP4_sCVM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
