import {Element, xml2js} from 'xml-js';

export interface XCSoarTask {
  type: string;
  aat_min_time: number | null; // seconds
  points: XCSoarPoint[];
}

export interface XCSoarPoint {
  type: string;
  waypoint: XCSoarWaypoint;
  observation_zone: XCSoarObservationZone;
}

export interface XCSoarWaypoint {
  name: string | null;
  altitude: number | null; // meters
  location: XCSoarLocation;
}

export interface XCSoarLocation {
  longitude: number; // degrees
  latitude: number; // degrees
}

export interface XCSoarObservationZone {
  type: string;
  radius?: number; // meters
  length?: number; // meters
}

export function read(xml: string): XCSoarTask {
  let root = xml2js(xml) as Element;
  let taskElement = root.elements!.find((it: any) => it.name === 'Task');
  return convertTask(taskElement);
}

function convertTask(xml: any): XCSoarTask {
  let attrs = xml.attributes || {};
  let type = attrs.type || 'RT';
  let aat_min_time = 'aat_min_time' in attrs ? parseInt(attrs.aat_min_time, 10) : null;
  let points = xml.elements.filter((it: any) => it.name === 'Point').map(convertPoint);
  return { type, aat_min_time, points };
}

function convertPoint(xml: any): XCSoarPoint {
  let attrs = xml.attributes || {};
  let type = attrs ? attrs.type : 'Turn';
  let waypoint = convertWaypoint(xml.elements.find((it: any) => it.name === 'Waypoint'));
  let observation_zone = convertObservationZone(xml.elements.find((it: any) => it.name === 'ObservationZone'));
  return { type, waypoint, observation_zone };
}

function convertWaypoint(xml: any): XCSoarWaypoint {
  let attrs = xml.attributes || {};
  let name = attrs.name || null;
  let altitude = 'altitude' in attrs ? parseFloat(attrs.altitude) : null;
  let location = convertLocation(xml.elements.find((it: any) => it.name === 'Location'));
  return { name, altitude, location };
}

function convertLocation(xml: any): XCSoarLocation {
  let longitude = parseFloat(xml.attributes.longitude);
  let latitude = parseFloat(xml.attributes.latitude);
  return { longitude, latitude };
}

function convertObservationZone(xml: any): XCSoarObservationZone {
  let type = xml.attributes.type;

  if ('length' in xml.attributes) {
    let length = parseFloat(xml.attributes.length);
    return { type, length };

  } else if ('radius' in xml.attributes) {
    let radius = parseFloat(xml.attributes.radius);
    return { type, radius };

  } else {
    return { type };
  }
}
