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

async function log() {
  const config = readConfig(program.opts().config);
  const token = config.token || "NzA2MDA2NTk3NzIyOusNrwhAn6JmllSjXDa3xaunsTns";
  const standUpTaskId = config.standup || 42543;
  let remainHour = 7;
  console.log(`token ${token} `);

  const isConnected = await checkConncection("https://jira.tdshop.io")

  if (!isConnected) {
    console.log("Jira is not connected")
    return
  }
  remainHour = await logStandUp(standUpTaskId, token, remainHour, 0.5); // 
  const tasks = await fetchAssignTasks(token);
  if (tasks.length != 0) {
    const eachTaskSpendingHour = Math.floor(remainHour / tasks.length)
    for (let task of tasks) {
      remainHour = await logWork(token, task.id, remainHour, eachTaskSpendingHour)
    }
  }else{

  await logWork( token,standUpTaskId, remainHour, remainHour,"ad-hoc work"); // log the rest if nothing to do on that day 

  }


}

function readConfig(path) {
  try {
    const rawData = fs.readFileSync(path);
    return JSON.parse(rawData);
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


async function logStandUp(taskId, token, remainHour, logHour) {
  const currentDate = DateTime.now().setZone('Asia/Bangkok').toISODate();

  const url = `https://jira.tdshop.io/rest/api/2/issue/${taskId}/worklog`;
  const body = JSON.stringify({
    "timeSpent": `${logHour}h`,
    "comment": "Daily meeting",
    "started": `${currentDate}T09:30:00.000+0700`
  })
  remainHour = remainHour - logHour
  console.log(`body ${JSON.stringify(body)}`);
  await RequestWorkload(token, body, url);
  return remainHour;


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

async function logWork(token, taskId, remainHour, logHour,comment ="") {


  const currentDate = DateTime.now().setZone('Asia/Bangkok').toFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZZZ");
  const url = `https://jira.tdshop.io/rest/api/2/issue/${taskId}/worklog`;
  const body = JSON.stringify({
    "timeSpent": `${logHour}h`,
    "comment": comment,
    "started": currentDate
  })

  remainHour = remainHour - logHour

  console.log(`body ${JSON.stringify(body)}`);


  await RequestWorkload(token, body, url);

  return remainHour;

}

program.parseAsync(process.argv)