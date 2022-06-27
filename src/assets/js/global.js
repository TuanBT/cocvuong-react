const fistRound = "Hiệp 1";
const breakRound = "Nghỉ giữa hiệp";
const secondRound = "Hiệp 2";
const breakExtraRound = "Nghỉ hiệp phụ";
const extraRound = "Hiệp phụ";
const greenColor = "#27ae60"; //Lục - Green
const yellowColor = "#f1c40f"; //Vàng - Yellow
const redColor = "#e74c3c"; //Đỏ - red
const grayColor = "#95a5a6"; //Xám - Gray
const whiteColor = "#ffffff"; //Trắng - white
const blackColor = "#000000"; //Đen - black
const orangeColor = "#e67e22"; //Cam - Orange
const bodyBgColor = "#ecf0f1"; //Xám nhạt
const silverColor = "#bdc3c7" //Bạc
const timeScore = 4; //3s Thời gian cho phép chấm điểm từ GD đầu tới cuối
const numReferee = 3; //Số lượng giám định chấm điểm

var timerCoundown;
var round = fistRound;
var matchNoCurrent;
var matchNoCurrentIndex;
var tournamentObj;
var match;
var timer;
var effectTimer;
var scoreTimer;
var sound;
var ref;
var isFirstRefereeScore = false;
var isTimerRunning = false;
var scoreTimerCount = timeScore;

const tournamentConst = {
    "lastMatch":
    {
        "no": 1
    },
    "setting":
    {
        "timeRound": 90,
        "timeBreak": 30,
        "timeExtra": 60,
        "timeExtraBreak": 15
    },
    "referee": [
        {
            "redScore": 0,
            "blueScore": 0
        },
        {
            "redScore": 0,
            "blueScore": 0
        },
        {
            "redScore": 0,
            "blueScore": 0
        }
    ],
    "tournament": []
}

var matchObj = {
    "match": {
        "no": 1,
        "type": "",
        "category": "",
        "win": ""
    },
    "fighters": {
        "redFighter": {
            "name": "Đỏ",
            "code": "",
            "score": 0
        },
        "blueFighter": {
            "name": "Xanh",
            "code": "",
            "score": 0
        }
    }
};

const tournamentMartialConst = {
    "lastMatchMartial": {
        "matchMartialNo": 1,
        "teamMartialNo": 1
    },
    "tournamentMartial": [
    ]
}

var matchMartialObj = {
    "match": {
        "name": ""
    },
    "team": []
};

var fightersMartialObj = {
    "fighters":[],
    "no": 0,
    "score": 0,
    "refereeMartial": [
        {
            "score":0
        },
        {
            "score":0
        },
        {
            "score":0
        }
    ],
}

var fighterMartialObj = {
    "fighter":
    {
        "code": "",
        "name": "",
    }
}