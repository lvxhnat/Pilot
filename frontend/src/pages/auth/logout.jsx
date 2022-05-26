import React, {useEffect} from 'react'
import axiosInstance from '../../components/auth/apientrypoints'
import {useNavigate} from 'react-router-dom'

export default function SignUp() {
  const history = useNavigate ()

  useEffect(() => {
    axiosInstance.post('/user/logout/blacklist/', {
      refresh_token: localStorage.getItem('heron_refresh_token')
    })
    localStorage.removeItem('heron_access_token')
    localStorage.removeItem('heron_refresh_token')
    axiosInstance.defaults.headers['Authorization'] = null
    setTimeout(() => {
      history('/login')
    }, 1500)
  })

  return (<div>
    <h1>You have been logged out.</h1>
    <h1> Redirecting you back to Login Page...</h1>
    </div>)
}
