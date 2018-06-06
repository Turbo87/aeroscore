export function formatResult(result: any) {
  return `Start: ${formatTime(result.start.time)}\n` +
    `Time: ${formatTime(result.totalTime)}\n` +
    `Distance: ${(result.distance)} km\n` +
    `Speed: ${(result.speed)} km/h\n`;
}

export function formatTime(time: number) {
  let date = new Date(time);
  return [
    date.getUTCHours().toString().padStart(2, '0'),
    date.getUTCMinutes().toString().padStart(2, '0'),
    Math.round(date.getUTCSeconds() + date.getUTCMilliseconds() / 1000).toString().padStart(2, '0'),
  ].join(':');
}

export function formatDuration(seconds: number) {
  let hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  let minutes = Math.floor(seconds / 60);
  seconds = Math.round(seconds % 60);

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
}
