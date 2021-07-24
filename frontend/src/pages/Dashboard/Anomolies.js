import React, { Component } from "react";

import { BASE_URL, DEFAULT_HEADERS } from '../../config/Constants'
import {
    Accordion, AccordionSummary, AccordionDetails,
    Typography, Grid, FormControl, Select, Card, CardContent
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import DrillDown from './DrillDown'
import moment from 'moment'
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import highchartsMore from 'highcharts/highcharts-more'; highchartsMore(Highcharts);

class Anomolies extends Component {
    constructor(props) {
        super(props)
        this.state = {
            kpi: props.kpi,
            timeline: props.timeline,
            chartData: [],
            graphData: [],
            drillDown: []
        }
    }
    findAnomalyZones = (intervals, values) => {
        let validColor = "#25cc7b",
            anomalyColor = "#ff5f5f";
        let zones = Array();
        let prev = null;
        let anomalyType = null; // 1 for above Confidence interval. -1 for below
        for (let i = 0; i < values.length; i++) {
            let interval = intervals[i],
                value = values[i];
            let zone = {
                value: value[0],
            };

            // point is an anomaly
            if (value[1] < interval[1]) {
                anomalyType = -1;
                zone.color = anomalyColor;
            } else if (value[1] > interval[2]) {
                anomalyType = 1;
                zone.color = anomalyColor;
            } else {
                zone.color = validColor;
            }

            // Push prev zone if colors should be different
            // Update prev zone
            if (prev != null && prev.color != zone.color) {
                const interIdx = anomalyType == 1 ? 2 : 1;
                let { m: m1, b: b1 } = this.findSlopeAndYIntercept(
                    [intervals[i - 1][0], intervals[i - 1][interIdx]],
                    [interval[0], [interval[interIdx]]]
                );
                let { m: m2, b: b2 } = this.findSlopeAndYIntercept(values[i - 1], value);
                let { x, y } = this.findIntersection(m1, b1, m2, b2);

                prev.value = x;
                zones.push(prev);
            }
            prev = zone;
        }

        zones.push({
            value: Date.UTC(9999), // Some arbitrarily high date that will put a zone that goes until the end
            color: validColor,
        });
        return zones;
    }

    // Find slope and y-intercept of line between two points
    findSlopeAndYIntercept = (p1, p2) => {
        const m = (p2[1] - p1[1]) / (p2[0] - p1[0]);
        const b = p1[1] - m * p1[0];
        return {
            m,
            b,
        };
    }

    // Find the intersection of 2 lines using the slope and y-intercept of each line.
    findIntersection = (m1, b1, m2, b2) => {
        let x = (b2 - b1) / (m1 - m2);
        let y = m1 * x + b1;
        return {
            x,
            y,
        };
    }
    renderChart = () => {
        let chartdata = []
        const { graphData } = this.state
        graphData.forEach((graphData, i) => {
            let zones = this.findAnomalyZones(graphData.intervals, graphData.values);

            let demoChart = {
                chart: {
                    zoomType: "x,y",
                    selectionMarkerFill: "rgba(37, 204, 123, 0.25)",
                },
                title: {
                    text: graphData.title,
                },
                xAxis: {
                    type: "datetime",
                    title: {
                        text: graphData.x_axis_label,
                    },
                },
                yAxis: {
                    title: {
                        text: graphData.y_axis_label,
                    },
                },
                tooltip: {
                    crosshairs: true,
                    shared: true,
                    valueSuffix: null,
                },
                plotOptions: {
                    series: {
                        marker: {
                            enabled: false
                        },
                        cursor: 'pointer',
                        point: {
                            events: {
                                click: (event) => this.handleGraphClick(event),
                                // click:  function () {
                                //     // alert('title: ' + this);
                                //     console.log("this",this)
                                // //    this.handleGraphClick(this.x)
                                // }
                            }
                        }
                    }
                },
                legend: {
                    enabled: false,
                    borderWidth: 1,
                    padding: 20,
                    title: {
                        text: 'Legend<br/><span style="font-size: 9px; color: #666; font-weight: normal">(Click to hide)',
                        style: {
                            fontStyle: "italic",
                        },
                    },
                },
                series: [
                    {
                        name: "Confidence Interval",
                        id: "Confidence Interval",
                        data: graphData.intervals,
                        type: "arearange",
                        lineWidth: 0,
                        linkedTo: ":previous",
                        color: "#29A374",
                        fillOpacity: 0.2,
                        zIndex: 0,
                        marker: {
                            fillColor: "grey",
                            enabled: false,
                            symbol: "diamond",
                        },
                    },
                    {
                        name: "Value",
                        id: "value",
                        zoneAxis: "x",
                        zones: zones,
                        data: graphData.values,
                        zIndex: 2,
                        color: "#25cc7b",
                        marker: {
                            fillColor: "white",
                            lineWidth: 1,
                            lineColor: "grey",
                            symbol: "circle",
                        },
                    },
                    {
                        name: "Predicted Value",
                        id: "predicted_value",
                        visible: false,
                        type: "line",
                        data: graphData.predicted_values,
                        zIndex: 1,
                        color: "#02964e",
                        dashStyle: "Dash",
                        opacity: 0.5,
                        marker: {
                            fillColor: "gray",
                            lineWidth: 1,
                            radius: 2,
                            lineColor: "white",
                            enabled: false,
                            symbol: "circle",
                        },
                    },
                ],
            }
            chartdata.push(demoChart)
        })
        this.setState({
            chartData: chartdata
        })
        // this.setState({
        //     chartData:{"chart":{"zoomType":"x,y","selectionMarkerFill":"rgba(37, 204, 123, 0.25)"},"title":{"text":"overall KPI using prophet"},"xAxis":{"type":"datetime","title":{"text":"Datetime"}},"yAxis":{"title":{"text":"Count of D num_purchases"}},"tooltip":{"crosshairs":true,"shared":true,"valueSuffix":null},"legend":{"enabled":true,"borderWidth":1,"padding":20,"title":{"text":"Legend<br/><span style=\"font-size: 9px; color: #666; font-weight: normal\">(Click to hide)","style":{"fontStyle":"italic"}}},"series":[{"name":"Confidence Interval","id":"Confidence Interval","data":[[1308096000000,954.69,2020.7],[1308182400000,1084.21,2085.84],[1308268800000,677.02,1753.51],[1308355200000,-594.07,463.11],[1308441600000,464.28,1501.97],[1308528000000,884.53,1876.43],[1308614400000,1032.99,2014.83],[1308700800000,978.51,1965.33],[1308787200000,1050.41,2115.82],[1308873600000,681.72,1702.59],[1308960000000,-571.91,450.9],[1309046400000,478.97,1505.33],[1309132800000,862,1900],[1309219200000,1023.83,2101.78],[1309305600000,947.94,2028.65],[1309392000000,1084.65,2123.94],[1309478400000,715.87,1742.34],[1309564800000,-595.08,431.56],[1309651200000,494.44,1548],[1309737600000,916.7,1932.85],[1309824000000,1039,2045.52],[1309910400000,976.07,2066.08],[1309996800000,1114.61,2134.73],[1310083200000,673.26,1740.75],[1310169600000,-509.12,527.44],[1310256000000,480.38,1551.95],[1310342400000,898.02,1937.55],[1310428800000,1061.25,2093.57],[1310515200000,1001.22,2037.33],[1310601600000,1094.28,2178.23],[1310688000000,684.03,1783.26],[1310774400000,-546.27,486.32],[1310860800000,510.44,1526.69],[1310947200000,893.75,2007.17],[1311033600000,1077.37,2097.96],[1311120000000,994.71,2040.03],[1311206400000,1096.11,2130.61],[1311292800000,720.08,1749.77],[1311379200000,-501.8,537.18],[1311465600000,527.73,1537],[1311552000000,964.22,1950.84],[1311638400000,1074.39,2081.1],[1311724800000,1032.67,2057.56],[1311811200000,1116.43,2152.94],[1311897600000,729.08,1775.67],[1311984000000,-571.76,542.09],[1312070400000,512.69,1575.9],[1312156800000,920.72,1977.82],[1312243200000,1038.8,2129.15],[1312329600000,992.39,2035.5],[1312416000000,1129.59,2145.77],[1312502400000,723.8,1782.44],[1312588800000,-493.87,513.25],[1312675200000,512.6,1555.91],[1312761600000,969.36,1973.01],[1312848000000,1087.87,2121.13],[1312934400000,1028.61,2091.77],[1313020800000,1130.25,2148.44],[1313107200000,774.14,1783.76],[1313193600000,-473.26,558.46],[1313280000000,551.43,1556.2],[1313366400000,937.88,2008.45],[1313452800000,1107.59,2146.63],[1313539200000,1031.3,2072.1],[1313625600000,1157.18,2231.09],[1313712000000,764.44,1789.03],[1313798400000,-509.48,558.23],[1313884800000,510.66,1605.38],[1313971200000,994.19,2001.41],[1314057600000,1130.75,2129.26],[1314144000000,1075.99,2107.24],[1314230400000,1152.07,2210.61],[1314316800000,765.24,1783.62],[1314403200000,-502.69,545.37],[1314489600000,566.17,1571.8],[1314576000000,962.52,1999.55],[1314662400000,1108.51,2147.24],[1314748800000,1111.26,2124.46],[1314835200000,1168.51,2215.89],[1314921600000,747.68,1797.2],[1315008000000,-470.79,531.46],[1315094400000,612.66,1602.09],[1315180800000,972.61,2033.27],[1315267200000,1147.95,2156.86],[1315353600000,1097.6,2101.39],[1315440000000,1142.6,2236.15],[1315526400000,795.85,1847.18],[1315612800000,-489.27,555.78],[1315699200000,594.62,1651.74],[1315785600000,1018.47,2068.9],[1315872000000,1142.5,2174.9],[1315958400000,1108.96,2099.18]],"type":"arearange","lineWidth":0,"linkedTo":":previous","color":"#29A374","fillOpacity":0.2,"zIndex":0,"marker":{"fillColor":"grey","enabled":false,"symbol":"diamond"}},{"name":"Value","id":"value","zoneAxis":"x","zones":[{"value":1308508347453.7556,"color":"#25cc7b"},{"value":1308541228290.624,"color":"#ff5f5f"},{"value":1309212471298.1838,"color":"#25cc7b"},{"value":1309224674270.8416,"color":"#ff5f5f"},{"value":1309719477669.176,"color":"#25cc7b"},{"value":1309851928579.988,"color":"#ff5f5f"},{"value":1310915852247.3442,"color":"#25cc7b"},{"value":1310967454494.786,"color":"#ff5f5f"},{"value":1312847845495.4675,"color":"#25cc7b"},{"value":1312848226232.4688,"color":"#ff5f5f"},{"value":1313277615829.3782,"color":"#25cc7b"},{"value":1313463285014.6748,"color":"#ff5f5f"},{"value":1314523774215.4678,"color":"#25cc7b"},{"value":1314708216535.098,"color":"#ff5f5f"},{"value":1314887376992.5112,"color":"#25cc7b"},{"value":1314964975672.2822,"color":"#ff5f5f"},{"value":1315263597339.0752,"color":"#25cc7b"},{"value":1315269423513.661,"color":"#ff5f5f"},{"value":1315664376078.364,"color":"#25cc7b"},{"value":1315739418398.333,"color":"#ff5f5f"},{"value":1315840029473.6843,"color":"#25cc7b"},{"value":1315893454202.9668,"color":"#ff5f5f"},{"value":253370764800000,"color":"#25cc7b"}],"data":[[1308096000000,1683],[1308182400000,1503],[1308268800000,942],[1308355200000,0],[1308441600000,1157],[1308528000000,1978],[1308614400000,1453],[1308700800000,1008],[1308787200000,1948],[1308873600000,1024],[1308960000000,0],[1309046400000,667],[1309132800000,1156],[1309219200000,999],[1309305600000,1315],[1309392000000,1609],[1309478400000,978],[1309564800000,0],[1309651200000,598],[1309737600000,2185],[1309824000000,2175],[1309910400000,1795],[1309996800000,1896],[1310083200000,1579],[1310169600000,0],[1310256000000,815],[1310342400000,1490],[1310428800000,1646],[1310515200000,1610],[1310601600000,1663],[1310688000000,1118],[1310774400000,0],[1310860800000,1246],[1310947200000,2167],[1311033600000,1576],[1311120000000,1993],[1311206400000,1494],[1311292800000,1281],[1311379200000,0],[1311465600000,1116],[1311552000000,1935],[1311638400000,1233],[1311724800000,1228],[1311811200000,1510],[1311897600000,1119],[1311984000000,0],[1312070400000,1270],[1312156800000,1189],[1312243200000,1332],[1312329600000,1521],[1312416000000,1782],[1312502400000,1442],[1312588800000,0],[1312675200000,529],[1312761600000,1455],[1312848000000,1087],[1312934400000,1360],[1313020800000,1935],[1313107200000,1113],[1313193600000,0],[1313280000000,538],[1313366400000,918],[1313452800000,1022],[1313539200000,1651],[1313625600000,1487],[1313712000000,811],[1313798400000,0],[1313884800000,1065],[1313971200000,1267],[1314057600000,1434],[1314144000000,1820],[1314230400000,1291],[1314316800000,925],[1314403200000,0],[1314489600000,1196],[1314576000000,0],[1314662400000,3218],[1314748800000,1176],[1314835200000,1399],[1314921600000,2333],[1315008000000,0],[1315094400000,1333],[1315180800000,1569],[1315267200000,1122],[1315353600000,2080],[1315440000000,1750],[1315526400000,1558],[1315612800000,0],[1315699200000,2027],[1315785600000,1638],[1315872000000,2428],[1315958400000,1333]],"zIndex":2,"color":"#25cc7b","marker":{"fillColor":"white","lineWidth":1,"lineColor":"grey","symbol":"circle"}},{"name":"Predicted Value","id":"predicted_value","visible":false,"type":"line","data":[[1308096000000,1474.19],[1308182400000,1574.33],[1308268800000,1186.34],[1308355200000,-61.53],[1308441600000,981.28],[1308528000000,1395.88],[1308614400000,1532.64],[1308700800000,1484.46],[1308787200000,1584.6],[1308873600000,1196.62],[1308960000000,-51.26],[1309046400000,991.55],[1309132800000,1406.15],[1309219200000,1542.91],[1309305600000,1494.74],[1309392000000,1594.87],[1309478400000,1206.89],[1309564800000,-40.99],[1309651200000,1001.82],[1309737600000,1416.42],[1309824000000,1553.19],[1309910400000,1505.01],[1309996800000,1605.14],[1310083200000,1217.16],[1310169600000,-30.72],[1310256000000,1012.09],[1310342400000,1426.69],[1310428800000,1563.46],[1310515200000,1515.28],[1310601600000,1615.41],[1310688000000,1227.43],[1310774400000,-20.45],[1310860800000,1022.36],[1310947200000,1436.96],[1311033600000,1573.73],[1311120000000,1525.55],[1311206400000,1625.69],[1311292800000,1237.7],[1311379200000,-10.18],[1311465600000,1032.63],[1311552000000,1447.23],[1311638400000,1584],[1311724800000,1535.82],[1311811200000,1635.96],[1311897600000,1247.97],[1311984000000,0.09],[1312070400000,1042.9],[1312156800000,1457.5],[1312243200000,1594.27],[1312329600000,1546.09],[1312416000000,1646.23],[1312502400000,1258.24],[1312588800000,10.36],[1312675200000,1053.17],[1312761600000,1467.78],[1312848000000,1604.54],[1312934400000,1556.37],[1313020800000,1656.51],[1313107200000,1268.52],[1313193600000,20.65],[1313280000000,1063.47],[1313366400000,1478.09],[1313452800000,1614.87],[1313539200000,1566.7],[1313625600000,1666.86],[1313712000000,1278.9],[1313798400000,31.04],[1313884800000,1073.87],[1313971200000,1488.5],[1314057600000,1625.28],[1314144000000,1577.13],[1314230400000,1677.29],[1314316800000,1289.33],[1314403200000,41.47],[1314489600000,1084.3],[1314576000000,1498.93],[1314662400000,1635.72],[1314748800000,1587.56],[1314835200000,1687.72],[1314921600000,1299.76],[1315008000000,51.9],[1315094400000,1094.74],[1315180800000,1509.36],[1315267200000,1646.15],[1315353600000,1598],[1315440000000,1698.16],[1315526400000,1310.19],[1315612800000,62.34],[1315699200000,1105.17],[1315785600000,1519.8],[1315872000000,1656.59],[1315958400000,1608.43]],"zIndex":1,"color":"#02964e","dashStyle":"Dash","opacity":0.5,"marker":{"fillColor":"gray","lineWidth":1,"radius":2,"lineColor":"white","enabled":false,"symbol":"circle"}}]}
        // })


    }
    fetchAnomoly = () => {
        fetch(`${BASE_URL}/api/kpi/${this.state.kpi}/anomaly-detection?timeline=${this.state.timeline}`)
            .then(response => response.json())
            .then(data => {
                if (data?.data) {
                    this.setState({
                        graphData: data.data
                    }, () => {
                        this.renderChart();
                    })
                }
            });
    }
    handleGraphClick = (event) => {
        const unixDate = event.point.x
        const newDate = moment(unixDate).format('DD-MM-YYYY');
        fetch(`${BASE_URL}/api/kpi/${this.state.kpi}/anomaly-drilldown?date=${newDate}`)
            .then(response => response.json())
            .then(data => {
                if (data?.data) {
                    this.setState({
                        drillDown: data.data
                    })
                }
            });
        console.log("slectedDate", unixDate, newDate)
    }
    componentDidUpdate(preProps) {
        if(this.props.kpi !== preProps.kpi){
            this.fetchAnomoly()
        }
    }
    componentDidMount() {
        this.fetchAnomoly()
    }

    render() {
        const { drillDown } = this.state;
        let itemList = []

        drillDown.map((obj) => {
            itemList.push(<DrillDown drillDown={obj} />)
        })
        console.log("chartdata", this.state.chartData[0])
        return (
            <>
                <Card className="chart-tab-card">
                    <CardContent>
                        <Grid container spacing={2} justify="flex-end" className="custom-dash-select">
                            <Grid item xs={12} md={2}>
                                <FormControl variant="outlined" style={{ width: '100%' }}>
                                    {/*onChange={(e) => this.handleTimelineChange(e)}*/}
                                    <Select native defaultValue={this.props.timeline} id="analysisTimeline" >
                                        <option value="dataquality">Data quality</option>
                                        <option value="multidimensional">Multidimensional</option>
                                    </Select>
                                </FormControl>
                            </Grid>
                            {/* <Grid item xs={12} md={3}>
                                <FormControl variant="outlined" style={{ width: '100%' }}>
                                    <Select native defaultValue={this.props.timeline} id="analysisTimeline" >
                                        <option value="mom">Display Window</option>
                                    </Select>
                                </FormControl>
                            </Grid> */}
                        </Grid>
                        <HighchartsReact
                            highcharts={Highcharts}
                            options={this.state.chartData[0]}
                        />
                    </CardContent>
                </Card>
                <Accordion className="custom-dash-accordian" defaultExpanded={false}>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                    >
                        <Typography component="h4" className="title">Drill Downs</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        {itemList}
                    </AccordionDetails>
                </Accordion>
                <Accordion className="custom-dash-accordian" defaultExpanded={false}>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                    >
                        <Typography component="h4" className="title">Correlation</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        {itemList}
                    </AccordionDetails>
                </Accordion>

            </>
        );
    }
}

export default Anomolies;
