import React, { useState } from 'react'
import axiosInstance from '../../components/auth/apientrypoints'
import { useNavigate } from 'react-router-dom'

import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'

import authStyles from '../../styles/auth/auth.module.css'

export default function SignIn() {
  const history = useNavigate()
  const initialFormData = Object.freeze({
    email: '',
    password: ''
  })

  const [formData, updateFormData] = useState(initialFormData)

  const handleChange = e => {
    updateFormData({
      ...formData,
      [e.target.name]: e.target.value.trim()
    })
  }

  const handleSubmit = e => {
    e.preventDefault()
    axiosInstance
      .post(`token/`, {
        user_name: formData.username,
        password: formData.password
      })
      .then(res => {
        history('/main')
        localStorage.setItem('pilot_access_token', res.data.access)
        localStorage.setItem('pilot_refresh_token', res.data.refresh) // Get the refresh and access token
        axiosInstance.defaults.headers['Authorization'] =
          'JWT ' + localStorage.getItem('pilot_access_token')
      })
  }

  return (
    <Grid container spacing={0} direction="column" alignItems="center">
      <Grid container className={authStyles.main}>
        <Grid container spacing={0} direction="column" alignItems="center">
        </Grid>

        <Grid
          container
          spacing={0}
          direction="column"
          alignItems="center"
          className={authStyles.textfieldcontainer}>
          <Grid container spacing={0} direction="column" alignItems="center">
            <input
              className={authStyles.textfield}
              autoComplete="off"
              type="username"
              maxLength="30"
              name="username"
              onChange={handleChange}
              placeholder="Username: "
            />
          </Grid>
          <Grid container spacing={0} direction="column" alignItems="center">
            <input
              className={authStyles.textfield}
              autoComplete="off"
              type="password"
              maxLength="30"
              name="password"
              onChange={handleChange}
              placeholder="Password: "
            />
          </Grid>
          <Grid container spacing={0} direction="column" alignItems="center">
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              style={{ backgroundColor: 'black', width: '25%' }}
              onClick={handleSubmit}>
              Sign In
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  )
}
