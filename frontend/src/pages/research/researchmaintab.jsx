import React, { useState, useRef } from 'react'

import Skeleton from '@mui/material/Skeleton';
import SearchIcon from '@mui/icons-material/Search'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { TreeItem, TreeView } from '@mui/lab'
import { Pagination, TextField } from '@mui/material'
import { FormControlLabel, Checkbox, Button, Grid } from '@mui/material'

import ArticleCard from '../../components/content/articlecard'
import NoDataSkeleton from '../../components/skeleton/nodataskeleton'
import ArticleCardSkeleton from '../../components/skeleton/articlecardskeleton';

import { BASEURL } from '../../components/constants'
import DocumentsOverTime from '../../components/pages/research/documentsovertime';
import CategoricalBreakdown from '../../components/pages/research/categoricalbreakdown';

import { sortArroObjs } from '../../functions/main'
import { numberWithCommas, tickFormatter } from '../../functions/main'
import researchStyles from '../../styles/research.module.css'
import Pilot from '../../static/pilot.jpeg'
import { writeToCache, writeDataToCache, readDataFromCache, readFromCache, writeGraphDataToCache, readGraphDataFromCache } from './researchmaintabfiles/cacheMethods';

import { useNavigate } from 'react-router-dom';
import VerifiedAxiosInstance from '../../components/auth/authenticatedentrypoint';

export default function ResearchMainTab() {

  var lastviewed_data = readFromCache('lastviewed')

  if (lastviewed_data !== null) {
    if (!(lastviewed_data['sorted_counts'] !== undefined && lastviewed_data['articlepreview_'] !== undefined && lastviewed_data['main'] !== undefined)) {
      writeToCache(new Object(), 'lastviewed')
      //var lastviewed_data = null
    }
  }

  try { var data_ = lastviewed_data['main']['data'] } catch { var data_ = undefined }
  try { var groupedbarchartdata_ = lastviewed_data['main']['groupedbarchartdata'] } catch { var groupedbarchartdata_ = undefined }
  try { var multilinechartdata_ = lastviewed_data['main']['multilinechartdata'] } catch { var multilinechartdata_ = undefined }
  try { var sortedcounts_ = lastviewed_data['sorted_counts'] } catch { var sortedcounts_ = undefined }
  try { var articlepreview_ = Object.values(lastviewed_data['articlepreview_']['data']) } catch { var articlepreview_ = undefined }
  try { var query_ = lastviewed_data['query'] } catch { var query_ = undefined }

  const pastdata_available = [query_, sortedcounts_, articlepreview_, data_, groupedbarchartdata_, multilinechartdata_].includes(undefined)

  const [data, setData] = useState(data_ !== undefined ? data_ : new Object())
  const [multilinechartdata, setMultilinechartdata] = useState(multilinechartdata_ !== undefined ? multilinechartdata_ : null)
  const [groupedbarchartdata, setGroupedbarchartdata] = useState(groupedbarchartdata_ !== undefined ? groupedbarchartdata_ : null)

  const [aggregatedcounts, setAggregatedcounts] = useState(sortedcounts_ !== undefined ? sortedcounts_ : null)
  // for Article preview
  const [articlepreview, setArticlepreview] = useState(articlepreview_ !== undefined ? articlepreview_ : null) // article previews
  const [scrapedarticlepreview, setScrapedarticlepreview] = useState()
  const [largestPage, setlargestPage] = useState(0) // The largest page paginated
  const [articleloading, setArticleloading] = useState(false)
  // General shared state objects
  const [loading, setLoading] = useState(false) // General loading state
  const [startstate, setStartstate] = useState(true)
  const [s1loadingstate, sets1Loadingstate] = useState(false)
  const [s2loadingstate, sets2Loadingstate] = useState(false)
  const [currentpage, setCurrentpage] = useState(10)
  const [query, setQuery] = useState(query_ !== undefined ? query_ : '')
  // For date & categorical filters 
  const currentYear = new Date().getFullYear()
  const [selectedcategories, setSelectedcategories] = useState([]);
  const [startYear, setStartYear] = useState(2000);
  const [endYear, setEndYear] = useState(currentYear);

  // Creating ref prevent re-rendering of parent component on every chamge. Solution: https://stackoverflow.com/questions/52028418/how-can-i-get-an-inputs-value-on-a-button-click-in-a-stateless-react-component
  let textInput = React.createRef()

  let navigate = useNavigate();
  const handleLogout = () => {
    navigate("/logout");
  }

  const textinputstyle = {
    border: '1px solid grey',
    padding: '3%',
    borderRadius: '3px',
    fontSize: '1vw',
    width: 130,
    height: 30,
    backgroundColor: 'white',
    textAlign : 'center'
  }

  function handlePaginate(value, startYear, endYear) {
    const maxpagevalue = Math.min(100, Math.max(0, Math.floor(data['num_results']['results'] / 10)))
    setCurrentpage(
      value + 10 <= maxpagevalue && value % 10 === 0 ? value + 10 : Math.floor(value / 10) * 10 + 10
      )
      if (value >= largestPage) {
        setArticleloading(true)
        setlargestPage(value)
      VerifiedAxiosInstance
        .get('/research/research/', {
          params: {
            search_query: query,
            category: "",
            page: value * 10,
            start_year: startYear,
            end_year: endYear,
          }
        })
        .then(response => {
          console.log(response.data, "This")
          var article_data = Object.values(response.data)
          setScrapedarticlepreview(article_data)
          setArticlepreview(article_data.slice(value * 10, value * 10 + 10))
          setArticleloading(false)
        })
    } else {
      // Dont repeat scrape for faster results
      setArticlepreview(scrapedarticlepreview.slice(value * 10, value * 10 + 10))
    }
  }



  // Category to sub category mapping
  var categoryobjs = new Object()
  var subarticles = (data['sub_articles'] !== undefined && data['sub_articles'] !== null && data['sub_articles'].length !== 0) ? data['sub_articles'] : null
  if (subarticles !== null) {
    data['sub_articles'].map(item => {
      categoryobjs[Object.keys(item)[0]] = item[Object.keys(item)[0]].map(res => res['sub'])
    })
    var categories = Object.keys(categoryobjs)
  }
  // Handle checking of the boxes
  function handleCheckbox(event) {
    const value = event.target.value;
    var arr = selectedcategories
    if (arr.includes(value)) { // uncheck
      arr = arr.filter(el => (el !== value))
    }
    else { // check the bosses
      arr.push(value)
    }
    // Perform submit after state update
    setSelectedcategories(arr);
    handleSubmit(arr)
  }

  function handleClearAll() {
    setSelectedcategories([]);
    handleSubmit([])
  }
  // Pre Load components, tree view and search box
  var treeview = []
  // https://codesandbox.io/s/upbeat-visvesvaraya-lg9b8?file=/src/App.js
  if (data['sub_articles'] !== undefined && data['sub_articles'] !== null) {
    if (data['sub_articles'].length !== 0) {
      data['sub_articles'].map((item, i) => {
        var key = Object.keys(item)[0]
        treeview.push(
          <TreeItem
            nodeId={i.toString()}
            label={
              <FormControlLabel
                key={i.toString().repeat(3)}
                style={{
                  display: 'table',
                  width: '100%'
                }}
                control={
                  <div
                    style={{
                      display: 'table-cell',
                      verticalAlign: 'middle',
                      float: 'left',
                      paddingLeft: '1%'
                    }}>
                    <Checkbox
                      onChange={handleCheckbox}
                      value={key}
                      checked={selectedcategories.includes(key)}
                      key={i.toString()}
                      style={{ margin: 0, padding: 0, left: 0, transform: 'scale(0.8)' }}
                    />
                  </div>
                }
                label={
                  <span style={{ fontSize: '0.8vw', verticalAlign: 'middle' }}>
                    {' '}
                    {tickFormatter(key) + ' (' + numberWithCommas(aggregatedcounts[key]) + ')'}{' '}
                  </span>
                }
              />
            }>
            {item[key]
              .sort((a, b) => (a.n > b.n ? -1 : b.n > a.n ? 1 : 0))
              .map((item, q) => (
                <React.Fragment>
                  <TreeItem
                    nodeId={i.toString() + '-' + q.toString()}
                    label={
                      <FormControlLabel
                        style={{
                          display: 'table',
                          width: '100%'
                        }}
                        control={
                          <div
                            style={{
                              display: 'table-cell',
                              verticalAlign: 'middle',
                              float: 'left',
                              paddingLeft: '1%'
                            }}>
                            <Checkbox
                              onChange={handleCheckbox}
                              checked={selectedcategories.includes(Object.keys(categoryobjs).find(key => categoryobjs[key].includes(item['sub'])))}
                              key={i.toString() + '-' + q.toString()}
                              value={item['sub']}
                              style={{ margin: 0, padding: 0, left: 0, transform: 'scale(0.8)' }}
                            />
                          </div>
                        }
                        label={
                          <span style={{ fontSize: '0.8vw', verticalAlign: 'middle' }}>
                            {' '}
                            {tickFormatter(item['sub']) + ' (' + numberWithCommas(item['n']) + ')'}
                          </span>
                        }
                      />
                    }
                  />
                </React.Fragment>
              ))}
          </TreeItem>
        )
      })
    } else {
      treeview = <NoDataSkeleton fontSize={'1.5vw'} />
    }
  } else {
    treeview = <NoDataSkeleton fontSize={'1.5vw'} />
  }


  // Start of handleSubmit
  async function handleSubmit(propcategory = null) {
    setStartstate(false)
    setLoading(true)
    var query = textInput.current.value 
    setQuery(query)

    var start = 2000
    var end = 2021
    var _document_type = 'article'
    var _language = 'English'
    var search_query = query.split(" ").join("+").toLowerCase()
    var search_category = propcategory !== null ? propcategory.join('%7C%7C') : selectedcategories.join('%7C%7C')

    const sitemetadata_ = 'https://backend.constellate.org/search2/?' +
      'keyword=' +
      search_query +
      '&provider=&start=' +
      start +
      '&end=' +
      end +
      '&publication_title=&language=' +
      _language +
      '&doc_type=' +
      _document_type +
      '&category=' +
      search_category +
      '&full_text=false&publisher=&jstor_discipline='

      const sitecatovertime_ = sitemetadata_

    const articlepreview_ = "research/research/" + query

    // Allow caching of previously retrieved data and checking if cache is available
    var cached_data = readDataFromCache(search_query)
    var cache_condition = ![null, undefined].includes(cached_data) || JSON.stringify(cached_data) === JSON.stringify({})
    // just for now, set metadatacache_ to default null!
    // var metadatacache_ = cache_condition ? cached_data[sitemetadata_] : null
    var metadatacache_ = null
    var articlepreviewcache_ = cache_condition ? cached_data[articlepreview_] : null
    var lvcache = new Object() // Last viewed cache
    var writecache = new Object()
    lvcache['query'] = search_query

    var axios = require('axios');
    var payload = JSON.stringify({
      "keyword": search_query,
      "provider": "",
      "start": startYear,
      "end": endYear,
      "publication_title": "",
      "language": "",
      "doc_type": "",
      "category": "",
      "full_text": false,
      "publisher": "",
      "jstor_discipline": ""
    });

    var config = {
      method: 'post',
      url: 'https://backend.constellate.org/search2/',
      headers: {
        'Authorization': process.env.REACT_APP_CONSTELLATE_ID,
        'content-type': 'application/json',
      },
      data: payload
    };

    if ([null, undefined].includes(metadatacache_)) {
      sets1Loadingstate(true)
      await axios(config)
        .then(response => {
          var cache = new Object()

          var num_results = response.data['results']['numFound']
          var sub_articles = response.data['results']['facets']['category']
          data['num_results'] = { results: num_results }
          // ** Sorts the categorical articles in descending order **
          data['sub_articles'] = sub_articles

          var sorted_counts = []
          var arr = []
          // Get the names to sort by, eg returns ['Arts', 'Business', ...]
          if (data['sub_articles'] !== undefined && data['sub_articles'] !== null) {
            Object.keys(data['sub_articles']).map((key, i) => {
              var article_count = data['sub_articles'][key]
                .map(item => item['n'])
                .reduce((a, b) => a + b, 0)
              sorted_counts.push({ [key]: article_count })
            })
          }

          var sort_arr = sorted_counts.sort(sortArroObjs)
          sort_arr = Object.keys(sort_arr).map(key => Object.entries(sort_arr[key])[0][0])
          if (data['sub_articles'] !== undefined && data !== null) {
            Object.keys(data['sub_articles']).map(key =>
              arr.push({ [key]: data['sub_articles'][key] })
            )
            arr = arr.sort(function (x, y) {
              var xkey = sort_arr.indexOf(Object.keys(x)[0])
              var ykey = sort_arr.indexOf(Object.keys(y)[0])
              return xkey - ykey
            })
          }
          // Reassigns the sorted arr into the key value
          data['sub_articles'] = arr
          // Save the sorted values into a single object

          sorted_counts = sorted_counts.reduce((r, c) => Object.assign(r, c), {})
          cache['sorted_counts'] = sorted_counts
          lvcache['sorted_counts'] = sorted_counts
          setAggregatedcounts(sorted_counts)

          // ** Sorts the categorical articles in descending order **
          cache['data'] = data
          setData(data)
          sets1Loadingstate(false)
          writecache[sitemetadata_] = cache
        })
        .catch((error) => console.log("first error:" + error))
    } else {
      sets1Loadingstate(true)
      var cached_data = metadatacache_
      setAggregatedcounts(cached_data.sorted_counts)
      lvcache['sorted_counts'] = cached_data.sorted_counts
      setData(cached_data.data)
      sets1Loadingstate(false)
    }




    // Categorical Graphs

    var graphKey = `${query} ${startYear} ${endYear}`
	  var cachedGraphDataExists = readGraphDataFromCache(graphKey) ? true : false

    // if ([null, undefined].includes(catovertimecache_)) { // if JSTOR API call is required (nothing in cache, or years dont match)
    if (!cachedGraphDataExists) {
      sets2Loadingstate(true)
      await axios(config)
        .then(response => {
          var graphDataCache = new Object()
          // Data formatting for multi line chart
          var category_by_year = response.data['by_year']
          data['category_by_year'] = category_by_year
          // Get the data in a format ready to push into recharts
          try {
            var cleaned_data = response.data["results"]["document_years"]
            graphDataCache['multilinechartdata'] = cleaned_data
            setMultilinechartdata(cleaned_data)
          } catch (err) { 
            console.log("Errored out at MultiLineChartData: " + err) 
          }
          // Data formatting for grouped bar chart
          try {
            var subarticle_list = []
            var article_items = data['sub_articles']
            article_items.map(item => {
              var entry = new Object()
              var key = Object.keys(item)[0]
              entry['name'] = key
              item[key].map(element => {
                entry[element['sub']] = element['n']
              })
              subarticle_list.push(entry)
            })
            graphDataCache['groupedbarchartdata'] = subarticle_list
            setGroupedbarchartdata(subarticle_list)
          } catch (err) { 
            console.log("Errored out at GroupedBarChartData: " + err) 
          }
          writeGraphDataToCache(graphKey, graphDataCache)
        })
        sets2Loadingstate(false)
    } else { // if JSTOR API call is not required
      sets2Loadingstate(true)
      console.log("Retrieving from cache.")
      try {
        var cachedGraphData = cachedGraphDataExists ? readGraphDataFromCache(graphKey) : null
        setGroupedbarchartdata(cachedGraphData["groupedbarchartdata"])
        setMultilinechartdata(cachedGraphData["multilinechartdata"])
      } catch {
        console.log("Error retrieving from cache.")
      }

      sets2Loadingstate(false)
    }
    // End of Categorical Graphs










    // Call to backend
    if ([null, undefined].includes(articlepreviewcache_)) {
      var cache = new Object()
      VerifiedAxiosInstance
        .get('research/research/', {
          params: {
            search_query: query,
            category: search_category,
            page: 0,
            start_year: startYear,
            end_year: endYear,
          }
        })
        .then(response => {
          cache['data'] = response.data
          lvcache['articlepreview_'] = cache
          writecache[articlepreview_] = cache
          setArticlepreview(Object.values(response.data))
        })
        .catch((error) => console.log("Error:" + error))
    } else {
      var cached_data = articlepreviewcache_
      lvcache['articlepreview_'] = cached_data
      setArticlepreview(Object.values(cached_data['data']))
    }
    // Write last viewed into cache
    writeToCache('lastviewed', lvcache)
    writeDataToCache(search_query, writecache)
    setLoading(false)
  }

  // End of handleSubmit

  const SearchBox = (
    <React.Fragment>
      <Grid container className={researchStyles.searchbox}>
        <Grid item xs={10}>
          <input ref={textInput} className={researchStyles.searchbar} placeholder="Search..." />
        </Grid>
        <Grid item xs={2}>
          <Button
            type="submit"
            disableRipple={true}
            to="/"
            onClick={e => handleSubmit(null)}
            style={{
              marginRight: '10%',
              backgroundColor: 'transparent',
              color: 'black'
            }}>
            <SearchIcon />
          </Button>
        </Grid>
      </Grid>
    </React.Fragment>
  )

  return (
    < React.Fragment >
      <Grid container>
        <Grid
          container
          justifyContent="center"
          align="center"
          direction="row"
          style={{ borderBottom: '1px solid #DFDFDF', padding: '1%', paddingLeft: '2%' }}>
          <Grid item xs={3}>
            <Grid container>
              <Grid item xs={2}>
                <Grid container>
                  <img src={Pilot} alt="" className={researchStyles.pilot} />
                </Grid>
                <Grid container className={researchStyles.pilottext}>
                  PILOT
                </Grid>
              </Grid>
              <Grid item xs={10}>
                {SearchBox}
              </Grid>
            </Grid>
          </Grid>
          <Grid item container xs={9} direction="row" justifyContent="flex-end" alignItems="flex-start" >
            <Button variant="contained" onClick={handleLogout}>Logout</Button>
          </Grid>
        </Grid>
        {/* Side Bar */}
        <Grid container>
          <Grid item xs={2} className={researchStyles.sidebar}>
            <Grid item container>
              Refine Search Results
            </Grid>
            <Grid item container>
              <Grid item container style={{ paddingTop: '10%', fontSize: '1vw' }}>
                Publication Dates
              </Grid>
              <Grid
                container
                justifyContent="center"
                align="center"
                direction="row"
                style={{ paddingTop: '3%', paddingRight: '5%' }}>
                <Grid item xs={5}>
                  <input type="number" style={textinputstyle} onChange={(e) => setStartYear(e.target.value)} value={startYear}/>
                </Grid>
                <Grid item xs={2} style={{ paddingLeft: '1%', paddingTop: '2%', fontSize: '1vw' }}>
                  {' '}
                  to{' '}
                </Grid>
                <Grid item xs={5}>
                  <input type="number" style={textinputstyle} onChange={(e) => setEndYear(e.target.value)} value={endYear}/>
                </Grid>
              </Grid>
              <Grid container>
                <Grid container style={{ paddingTop: '10%', fontSize: '1vw' }}>
                  <Grid item xs={8} style={{ marginLeft: '-6%' }}>
                    Categorical Filters
                  </Grid>
                  <Grid item xs={4}>
                    {selectedcategories.length !== 0 ?
                      <button
                        className={researchStyles.clearallbutton}
                        onClick={handleClearAll}
                      > Clear All </button> :
                      <button
                        className={researchStyles.disabledclearallbutton}
                        disabled> Clear All </button>}
                  </Grid>
                </Grid>
                <Grid
                  container
                  style={{ paddingTop: '3%' }}
                  justifyContent="center"
                  align="center"
                  direction="row">
                  {loading && !startstate ?
                    <Skeleton animation="wave" style={{ minWidth: '100%', minHeight: '500px', marginTop: '-50%' }} />
                    : <TreeView
                      defaultCollapseIcon={<ExpandMoreIcon />}
                      defaultExpandIcon={<ChevronRightIcon />}>
                      {treeview}
                    </TreeView>}
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          {/* Side Bar */}
          {/* Mid Section */}
          <Grid item xs={5}>
            <Grid container className={researchStyles.results}>
              {loading && !startstate ?
                <Skeleton animation="wave" style={{ minWidth: '50%' }} />
                : (startstate && pastdata_available
                  ? 'Query dataset'
                  : !s1loadingstate && !s2loadingstate
                    ? numberWithCommas(data['num_results']['results']) + ' documents found for ' + query.split("+").join(" ")
                    : 'Loading results')}
            </Grid>

            {/* Generating article cards  */}
            <Grid container style={{ padding: '2%' }}>
              {!articleloading && ![undefined, null].includes(articlepreview) ? (
                articlepreview.length !== 0 ?
                  articlepreview.map((item, i) => (
                    <React.Fragment>
                      <ArticleCard
                        newquery={true}
                        loading={loading}
                        keyid={i}
                        abstract={item.Abstract}
                        citations={item.Citations}
                        author={item.Author}
                        title={item.title}
                        category={item.categories}
                        publishdate={item.publication_year}
                        pubhouse={item.publication_house}
                        url={item.url}
                      />
                    </React.Fragment>
                  )) :
                  <NoDataSkeleton />)
                : (loading && !startstate) || articleloading ? (
                  [...Array(10).keys()].map(i => <ArticleCardSkeleton keyid={i} />)) :
                  (<NoDataSkeleton />)}
            </Grid>

            {articlepreview !== undefined && articlepreview !== null ? (
              <Grid
                container
                justifyContent="center"
                align="center"
                direction="row"
                style={{ padding: '2%', paddingTop: '5%' }}>
                {data['num_results']['results'] <= 10 ? null :
                  <Pagination
                    onChange={(event, value) => handlePaginate(value, startYear, endYear)}
                    size="small"
                    siblingCount={2}
                    showFirstButton={true}
                    count={Math.ceil(data['num_results']['results'] / 10) <= 10 ? Math.ceil(data['num_results']['results'] / 10) : currentpage} // Limit pagination to 100
                    shape={'rounded'}
                  />
                }
              </Grid>
            ) : null}
          </Grid>
          {/* Mid Section */}
          {/* End Section - Charting */}
          <Grid item xs={5} style={{ paddingRight: '1%' }}>
            <DocumentsOverTime
              loading={loading}
              startstate={startstate}
              width={'100%'}
              height={500}
              multilinechartdata={multilinechartdata}
            />
            <CategoricalBreakdown
              loading={loading}
              startstate={startstate}
              width={'100%'}
              height={700}
              groupedbarchartdata={groupedbarchartdata}
            />
          </Grid>
          {/* End Section - Charting */}
        </Grid>
      </Grid>
    </React.Fragment >
  ) 
}