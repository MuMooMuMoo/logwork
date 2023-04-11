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
  .command('standUp <dayStr>')
  .description('log for a day  task')
  .action(logStandUpCommand);  

  program
  .command('task <taskID> <day>  <hour>')
  .description('log for a day  task')
  .action(logTaskCommand);    

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
  let remainHour = 7;
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


async function logWorkForCurrentDate(taskId, token, logHour,comment ="") {
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

program.parseAsync(process.argv)