import fs = require('fs');
import Task from './task/task';
import { taskFromJson} from './task/task-from-json';
import {xmlToJson} from './xcsoar/xml-to-json';

export function readTaskFromString(str: string): Task {
  let json = xmlToJson(str);
  return taskFromJson(json);
}

export function readTask(path: string): Task {
  let file = fs.readFileSync(path, 'utf8');
  return readTaskFromString(file);
}
