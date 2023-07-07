import { Command } from "commander";
import { DateTime } from "luxon";
import fs from 'fs';


const program = new Command();


program
  .name('logwork')
  .version('0.0.1')
  .option('-c, --config <path>', 'set config path', './logwork.json');

program
  .command('log', { isDefault: true })
  .description('perform log')
  .action(log);

  program
  .command('logForward <day>')
  .description('log for a number of day  task')
  .action(logForwardCommand);   


  program
  .command('logBackward <day>')
  .description('log for a number of day  task')
  .action(logBackwardCommand);   

program
  .command('standUp <dayStr>')
  .description('log for a day  task')
  .action(logStandUpCommand);  

  program
  .command('task <taskID> <day>  <hour>')
  .description('log for a day  task')
  .action(logTaskCommand);    


  async function logForwardCommand(dayStr) {
    const config = readConfig(program.opts().config);
    const token = config.token;
    const standUpTaskId = config.standup;
    const tasks = config.tasks
    console.log(`token ${token} `);
  
    const isConnected = await checkConncection("https://jira.tdshop.io")
  
    if (!isConnected) {
      console.log("Jira is not connected")
      return
    }

    // convert day to number
    const dayNumber = parseInt(dayStr)
    let tasksInfo = await getTaskInfo(token,tasks)
    console.log(tasksInfo)

    for(let i = 0 ; i < dayNumber ; i++){
      const day = i == 0 ?  DateTime.now().setZone('Asia/Bangkok') : DateTime.now().setZone('Asia/Bangkok').plus({days: i})
      if(!isWeekend(day)){
        console.log("log for day ",day.toISODate())
      await logStandUp(standUpTaskId,token,0.5,day.toISODate());
      // calculate remain hour also
      // remainHour = remainHour - 0.5
      // const tasks = await fetchAssignTasks(token);
      // if (tasks.length != 0) {
      //   const eachTaskSpendingHour = Math.floor(remainHour / tasks.length)
      //   for (let task of tasks) {
      //      remainHour = remainHour - eachTaskSpendingHour
      //      await logWorkForCurrentDate(token, task.id, eachTaskSpendingHour)
      //   }  
      // }else{ 

      if(tasksInfo.length > 0){
        
        // get first task
        let  { key,estimate } = tasksInfo[0]
          
          
            await logWork(token,key,7.5,day.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZZZ"),"");

            tasksInfo[0].estimate = tasksInfo[0].estimate - 1
            if(( tasksInfo[0].estimate == 0)){
              tasksInfo.shift()
            }
         
      }else{

        await logWork(token,standUpTaskId,7.5,day.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZZZ"),"ad-hoc work");
      }
      
      // }
    }
    

  }

}
  //getTaskInfo
  async function getTaskInfo(token,tasks){
    let myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");
    myHeaders.append("Authorization", `Bearer ${token}`);
    var requestOptions = {
      method: 'GET',
      headers: myHeaders,
    };
    var result =[]
    for(let taskId of tasks){
      const response = await fetch("https://jira.tdshop.io/rest/api/2/issue/"+taskId, requestOptions)
    
      const task = await response.json().catch(error => console.log('error', error));
    
      result.push( {
          "key": task.key,
          "estimate": Math.ceil(task.fields.timetracking.originalEstimateSeconds/28800),
        })
  

    }
      return result;
    

  }


  async function logBackwardCommand(dayStr) {
    const config = readConfig(program.opts().config);
    const token = config.token;
    const standUpTaskId = config.standup;
    console.log(`token ${token} `);
  
    const isConnected = await checkConncection("https://jira.tdshop.io")
  
    if (!isConnected) {
      console.log("Jira is not connected")
      return
    }

    // convert day to number

    const tasks = await fetchAssignTasks(token);
    for(let i = 0 ; i < dayNumber ; i++){
      console.log('here')
      const day =  DateTime.now().setZone('Asia/Bangkok').minus({days: i+1})

      if(!isWeekend(day)){
      await logStandUp(standUpTaskId,token,0.5,day.toISODate());
      await logWork(token,standUpTaskId,7.5,day.toFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZZZ"),"ad-hoc work");
    
      }
      // }
    }
    
    
  }

  async function logTaskCommand(taskID,day,hour) {  
    const config = readConfig(program.opts().config);
    const token = config.token;

    const isConnected = await checkConncection("https://jira.tdshop.io")
  
    if (!isConnected) {
      console.log("Jira is not connected")
      return
    }

    await logWork(token, taskID, hour,DateTime.fromISO(day).toFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZZZ"),"work on task") 

  }


async function logStandUpCommand(dayStr) {  
  const config = readConfig(program.opts().config);
  const token = config.token;
  const standUpTaskId = config.standup;
  const isConnected = await checkConncection("https://jira.tdshop.io")

  if (!isConnected) {
    console.log("Jira is not connected")
    return
  }

  const day  = DateTime.fromISO(dayStr)


   await logStandUp(standUpTaskId, token, 0.5,day.toISODate()); // 

}

async function log() {
  const config = readConfig(program.opts().config);
  const token = config.token;
  const standUpTaskId = config.standup;
  let remainHour = 8;
  console.log(`token ${token} `);

  const isConnected = await checkConncection("https://jira.tdshop.io")

  if (!isConnected) {
    console.log("Jira is not connected")
    return
  }
  await logStandUpForCurrentDate(standUpTaskId, token, 0.5); 
  remainHour = remainHour - 0.5

  const tasks = await fetchAssignTasks(token);
  if (tasks.length != 0) {
    const eachTaskSpendingHour = Math.floor(remainHour / tasks.length)
    for (let task of tasks) {
       remainHour = remainHour - eachTaskSpendingHour
       await logWorkForCurrentDate(token, task.id, eachTaskSpendingHour)
    }  
  }else{ 

  await logWorkForCurrentDate( token,standUpTaskId, remainHour,"ad-hoc work"); // log the rest if nothing to do on that day 

  }


}

function readConfig(path) {
  try {
    const rawData = fs.readFileSync(path);
    const config = JSON.parse(rawData);

    if(config.token && config.standup){
      return config
    }else{
      throw Error("plz specify token and standup task id")
    }
   
  } catch (error) {
    console.log("error", error);
    throw Error("Cannot read config file")
  }

}
async function checkConncection(url) {
  const result = await fetch(url, { method: 'HEAD' })
    .then(response => {
      if (response.ok) {
        return response.status == 200 ? true : false
      } else {
        return false
      }
    })
    .catch(error => {
      return false
    });

  return result
}

async function fetchAssignTasks(token) {


  let myHeaders = new Headers();
  myHeaders.append("Accept", "application/json");
  myHeaders.append("Authorization", `Bearer ${token}`);

  var requestOptions = {
    method: 'GET',
    headers: myHeaders,
  };

  const response = await fetch("https://jira.tdshop.io/rest/api/2/search?jql=assignee = currentUser() AND status in (\"In Progress\",\"In Review\")", requestOptions)

  const tasks = await response.json().catch(error => console.log('error', error));
  return tasks.issues.map(task => {

    return {
      "id": task.id,
      "name": task.summary,
      "progress": task.fields.progress,
    }

  })

}


async function logStandUp(taskId, token, logHour,currentDate) {

  const url = `https://jira.tdshop.io/rest/api/2/issue/${taskId}/worklog`;
  const body = JSON.stringify({
    "timeSpent": `${logHour}h`,
    "comment": "Daily meeting",
    "started": `${currentDate}T09:30:00.000+0700`
  })
  console.log(`body ${JSON.stringify(body)}`);
  await RequestWorkload(token, body, url);

}

async function logStandUpForCurrentDate(taskId, token, logHour) {
  const currentDate = DateTime.now().setZone('Asia/Bangkok').toISODate();
await logStandUp(taskId,token,logHour,currentDate);
}


async function RequestWorkload(token, body, url) {
  let myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Authorization", `Bearer ${token}`);
  let requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: body
  };

  const response = await fetch(url, requestOptions);
  if (!response.ok) {
    const error = await response.text();
    console.error(`Request failed status ${response.status} response ${error}`);
  }
}


async function logWorkForCurrentDate( token, taskId,logHour,comment ="") {
  const currentDate = DateTime.now().setZone('Asia/Bangkok').toFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZZZ");
  await logWork(token,taskId,logHour,currentDate,comment);
}
async function logWork(token, taskId, logHour,date,comment) {

  const url = `https://jira.tdshop.io/rest/api/2/issue/${taskId}/worklog`;
  const body = JSON.stringify({
    "timeSpent": `${logHour}h`,
    "comment": comment,
    "started": date
  })

  console.log(`body ${JSON.stringify(body)}`);

  await RequestWorkload(token, body, url);

}

function isWeekend(day) {
  let today = day.weekday;
  return (today === 6 || today === 7);
}

program.parseAsync(process.argv)