This tool log stand up meeting  0.5h  by default,
log the rest per your in progress task (you have to assign the task for your self and set it to in progress). If there is not task when the command was run. it will log ad-hoc task for you

Plz setup file config
```
{
    "token":"NzA2MDA2NTk3NzIyOusNrwhAn6JmllSjXDa3xaunsTns", <--- your jira token
    "standUpTaskId":"BO-12572"  // <--- task standup
}
```

How to use 

```
logwork -c PATH_TO_CONFIG 

```


Things to improve 

-  Prevent log time exceed estimate time.
-  How to handle holiday and vacation leave.
-  add sub command for log any task , for vacation leave 