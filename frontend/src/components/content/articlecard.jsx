import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import ArticleCardSkeleton from '../skeleton/articlecardskeleton'
import articlecardStyles from '../../styles/components/articlecard.module.css'
import VerifiedAxiosInstance from '../auth/authenticatedentrypoint'
import { generateStringID } from '../../functions/main'

import Grid from '@mui/material/Grid'
import CircularProgress from '@mui/material/CircularProgress';

export default function ArticleCard(props) {
  const added = props.added // If this item is added in our user archives or not
  const [selected, setSelected] = useState(added ? added : false)
  const [downloading, setDownloading] = useState(false)
  const [linkavailable, setLinkavailable] = useState(true)
  const [gscholardata, setGscholardata] = useState({})
  const [gscholarload, setGscholarload] = useState(false)
  var propcategory = props.category
  const category =
    propcategory !== undefined && propcategory !== null && propcategory !== ''
      ? propcategory.constructor === Array
        ? propcategory.join(' | ')
        : propcategory
      : null // Check the type of propcategory if it is defined
  const title = props.title
  const publish_date = props.publishdate
  const url = props.url
  const pub_house = props.pubhouse
  const loadingstate = props.loading
  const startstate = props.startstate
  const abstract = props.abstract
  const citations = props.citations
  const author = props.author

  // Get the user for user specific database storage
  var access_token = localStorage.getItem('heron_access_token')
  const user_id =
    access_token === null ? null : JSON.parse(atob(access_token.split('.')[1]))['user_id']

  async function getGscholarInfo(query) {
    setGscholarload(true)
    await VerifiedAxiosInstance.get('research/researchgscholar/', {
      params: {
        query: query,
      }
    }).then(
      response => {
        var gscholar_dat = response.data
        gscholar_dat['title'] = title
        setGscholardata(gscholar_dat)
      }
    ).catch(
      err => {
        console.log("Returned error code of " + err)
      }
    )
    setGscholarload(false)
  }

  function getLibgenLink(query) {
    const search_query = query.replaceAll(":", "%3A").split(" ").join("+")
    setDownloading(true)
    VerifiedAxiosInstance.get('research/researchlibgen/', {
      params: {
        query: search_query,
      }
    }).then(
      response => {
        window.location = response.data
        setDownloading(false)
        if (response.data === "") {
          setLinkavailable(false)
        }
      }
    ).catch(
      err => {
        console.log("getLibgenLink returned error code of " + err)
      }
    )
  }

  function handleClick() {
    setSelected(!selected)
    var uid = generateStringID(title, publish_date)
    if (!selected) {

      const post_params = {
        Title: title,
        Link: url,
        PubYear: publish_date,
        DateAdded: new Date().toLocaleString(),
        TitleID: uid,
        Category: category,
        UserID: user_id,
        Abstract: Object.keys(gscholardata).length !== 0 ? gscholardata['abstract'] : null,
        Citations: Object.keys(gscholardata).length !== 0 ? gscholardata['citations'] : null,
        Author: Object.keys(gscholardata).length !== 0 ? gscholardata['author'].join(" | ") : null,
      }
      VerifiedAxiosInstance.post('research/researcharchive/', post_params).then(response => {
        if (!response.status === 201) {
          setSelected(!selected)
        } else {
        }
      })
    } else {
      const delete_params = {
        TitleID: uid,
        UserID: user_id
      }
      VerifiedAxiosInstance.delete('research/researcharchive/', { data: delete_params }).then(
        response => {
          if (!response.status === 204) {
            setSelected(!selected)
          } else {
          }
        }
      )
    }
  }

  return (
    <React.Fragment>
      {loadingstate && !startstate ?
        <ArticleCardSkeleton key={props.keyid} />
        :
        <Grid
          key={props.keyid}
          container
          style={{ padding: '2%', paddingLeft: '0', borderBottom: '1px solid #DFDFDF' }}>
          <Grid container style={{ fontSize: '0.9vw', fontWeight: 'bold', color: '#595858' }}>
            <Grid item xs={10} style={{ paddingRight: '1%' }}>
              {url !== undefined && url !== '' && url !== null ? (
                <a
                  href={url}
                  target="_blank"
                  underline="always"
                  style={{color: '#0645AD' }}
                  >
                  {title}
                </a>
              ) : (
                title
              )}
            </Grid>
            <Grid item xs={2}>
              {downloading ?
                <Grid
                  style={{ fontSize: '0.75vw', border: '1px solid grey', backgroundColor: '#517188', color: 'white', fontWeight: 'light', padding: '1% 5%', borderRadius: '4px' }}
                  container
                  direction="row"
                  alignItems="center"
                  justifyContent="center">
                  <Grid item xs={4} style={{ paddingTop: '3%' }}>
                    <CircularProgress color="warning" size={18} />
                  </Grid>
                  <Grid item xs={8} style={{ textAlign: 'middle', paddingLeft: '3%', fontWeight: '400' }}>
                    Preparing
                  </Grid>
                </Grid>
                : (linkavailable ?
                  <button className={articlecardStyles.downloadbuttonStyle} onClick={e => getLibgenLink(title)}>
                    Download Paper
                  </button> :
                  "Link Unavailable"
                )}
            </Grid>
          </Grid>
          <Grid
            container
            style={{ paddingTop: '2%', color: 'grey', fontSize: '0.9vw' }}
            justifyContent="left"
            align="left"
            direction="row">
            {category !== '' && category !== 'None' ? (
              <Grid container style={{ paddingBottom: '2%', fontSize: '0.8vw' }}>
                <b>Category: &nbsp; </b> {category}
              </Grid>
            ) : null}
            <Grid container style={{ fontSize: '0.8vw' }}>
              <Grid item xs={1}>
                {publish_date}
              </Grid>
              <Grid item xs={7}>
                {pub_house}
              </Grid>

              <Grid item xs={4} align="right" paddingRight="2%">
                <button
                  onClick={handleClick}
                  className={
                    selected
                      ? articlecardStyles.activebuttonStyle
                      : articlecardStyles.inactivebuttonStyle
                  }>
                  {selected ? 'Remove from Archives' : 'Add to Archives'}
                </button>
              </Grid>
            </Grid>

            <Grid container>
              {gscholarload ?
                <span style={{ fontSize: '0.8vw' }}><CircularProgress size={10} /> Retrieving article data... </span> :
                (Object.keys(gscholardata).length !== 0 && gscholardata.title === title ? null :
                  <button className={articlecardStyles.readmorebuttonStyle} onClick={e => { getGscholarInfo(title) }}>
                    Read more
                  </button>
                )
              }
            </Grid>
            <Grid container>
              {Object.keys(gscholardata).length !== 0 && gscholardata.title === title ?
                <Grid container style={{ fontSize: '0.8vw' }}>
                  <Grid container style={{ paddingTop: '1%', fontWeight: 'bold' }}> Author: <span style={{ fontWeight: 'normal', paddingLeft: '0.5%' }}> {gscholardata['author'].join(" | ")} </span> </Grid>
                  <Grid container style={{ paddingTop: '1%', fontWeight: 'bold' }}> Citations: <span style={{ fontWeight: 'normal', paddingLeft: '0.5%' }}>{gscholardata['citations']}</span> </Grid>
                  <Grid container style={{ paddingTop: '1%', fontWeight: 'bold' }}> Abstract </Grid>
                  <Grid container style={{ paddingTop: '1%', fontWeight: 'normal', paddingLeft: '0.5%' }}> {gscholardata['abstract']} </Grid>
                </Grid> :
                ((![undefined, null].includes(author) || ![undefined, null].includes(abstract) || ![undefined, null].includes(citations)) ?
                  <Grid container style={{ fontSize: '0.8vw' }}>
                    <Grid container style={{ paddingTop: '1%', fontWeight: 'bold' }}> Author: <span style={{ fontWeight: 'normal', paddingLeft: '0.5%' }}> {author} </span> </Grid>
                    <Grid container style={{ paddingTop: '1%', fontWeight: 'bold' }}> Citations: <span style={{ fontWeight: 'normal', paddingLeft: '0.5%' }}>{citations}</span> </Grid>
                    <Grid container style={{ paddingTop: '1%', fontWeight: 'bold' }}> Abstract </Grid>
                    <Grid container style={{ paddingTop: '1%', fontWeight: 'normal', paddingLeft: '0.5%' }}> {abstract} </Grid>
                  </Grid> : <Grid container>
                    {/* {console.log("empty container")} */}
                  </Grid>
                )
              }
            </Grid>
          </Grid>
        </Grid>}
    </React.Fragment >
  )
}
