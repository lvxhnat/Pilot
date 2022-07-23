import React from 'react'
import Grid from '@mui/material/Grid'
import GroupedBarChart from '../../charting/barcharts/groupedbar'
import { sortObject } from '../../../functions/main'
import Skeleton from '@mui/material/Skeleton';

export default function CategoricalBreakdown(props) {
  var groupedbarchartdata = props.groupedbarchartdata
  var groupedbarchartdata =
    groupedbarchartdata !== undefined && groupedbarchartdata !== null
      ? groupedbarchartdata.map(item => sortObject(item, true))
      : null

  const width = props.width
  const height = props.height
  const loadingstate = props.loading

  return (
    <React.Fragment>
      <Grid container style={{ minHeight: '100px' }}>
        <Grid
          container
          style={{
            padding: '3%',
            paddingLeft: '0',
            paddingBottom: '2%',
            borderBottom: '1px solid #efeded'
          }}>
          <Grid item xs={6} style={{ fontSize: '1vw', color: 'grey' }}>
            Categorical breakdown
          </Grid>
        </Grid>
        {loadingstate ?
          <Grid container>
            <Skeleton animation="wave" style={{ minHeight: '900px', minWidth: '100%', marginTop: '-30%' }} />
          </Grid>
          :
          <Grid
            container
            style={
              groupedbarchartdata !== null && groupedbarchartdata !== undefined
                ? { paddingTop: '2%', minHeight: '250px' }
                : { paddingTop: '2%', minHeight: '200px' }
            }>
            <GroupedBarChart
              width={width}
              height={height}
              groupedbarchartdata={
                groupedbarchartdata !== null && groupedbarchartdata !== undefined
                  ? groupedbarchartdata
                  : null
              }
            />
          </Grid>
        }
      </Grid>
    </React.Fragment>
  )
}
