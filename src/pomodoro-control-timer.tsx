import {
  Action,
  ActionPanel,
  Cache,
  closeMainWindow,
  Icon,
  launchCommand,
  LaunchType,
  List,
  popToRoot
} from "@raycast/api";
import { exec } from "child_process";
import {
  continueInterval,
  createInterval,
  getCurrentInterval,
  Interval,
  isPaused,
  pauseInterval,
  preferences,
  resetInterval
} from "../lib/intervals";

const cache = new Cache();
const CACHE_KEY = "shortBreakCount";

function getShortBreakCount() {
  const count = cache.get(CACHE_KEY);
  return count ? parseInt(count, 10) : 0;
}

function incrementShortBreakCount() {
  const count = getShortBreakCount();
  cache.set(CACHE_KEY, (count + 1).toString());
}

function resetShortBreakCount() {
  cache.set(CACHE_KEY, "0");
}

function decideNextInterval(currentInterval: Interval) {
  const count = getShortBreakCount();

  if (currentInterval.type === "focus") {
    if (count >= 3) {
      resetShortBreakCount();
      return "long-break";
    } else {
      incrementShortBreakCount();
      return "short-break";
    }
  } else {
    // После короткого или длинного перерыва всегда возвращаемся к фокус-интервалу
    return "focus";
  }
}


const createAction = (action: () => void) => () => {
  action();

  try {
    launchCommand({
      name: "pomodoro-menu-bar",
      type: LaunchType.UserInitiated
    });
  } catch (error) {
    console.error(error);
  }

  popToRoot();
  closeMainWindow();
};

const ActionsList = () => {
  const currentInterval = getCurrentInterval();

  return (
    <List navigationTitle="Control Pomodoro Timers">
      {currentInterval ? (
        <>
          {isPaused(currentInterval) ? (
            <List.Item
              title="Continue"
              icon={Icon.Play}
              actions={
                <ActionPanel>
                  <Action onAction={createAction(continueInterval)} title={"Continue"} />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              title="Pause"
              icon={Icon.Pause}
              actions={
                <ActionPanel>
                  <Action onAction={createAction(pauseInterval)} title={"Pause"} />
                </ActionPanel>
              }
            />
          )}
          <List.Item
            title="Reset"
            icon={Icon.Stop}
            actions={
              <ActionPanel>
                <Action onAction={createAction(resetInterval)} title={"Reset"} />
              </ActionPanel>
            }
          />
        </>
      ) : (
        <>
          <List.Item
            title={`Focus`}
            subtitle={`${preferences.focusIntervalDuration}:00`}
            icon={`🎯`}
            actions={
              <ActionPanel>
                <Action onAction={createAction(() => createInterval("focus"))} title={"Focus"} />
              </ActionPanel>
            }
          />
          <List.Item
            title={`Short Break`}
            subtitle={`${preferences.shortBreakIntervalDuration}:00`}
            icon={`🧘‍♂️`}
            actions={
              <ActionPanel>
                <Action onAction={createAction(() => createInterval("short-break"))} title={"Short Break"} />
              </ActionPanel>
            }
          />
          <List.Item
            title={`Long Break`}
            subtitle={`${preferences.longBreakIntervalDuration}:00`}
            icon={`🚶`}
            actions={
              <ActionPanel>
                <Action onAction={createAction(() => createInterval("long-break"))} title={"Long Break"} />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
};

const EndOfInterval = ({ currentInterval }) => {
  // Запускаем заставку, если текущий интервал был фокусом
  if (currentInterval.type === "focus") {
    startScreenSaver();
  }

  // Определяем следующий интервал
  const nextIntervalType = decideNextInterval(currentInterval); // Убедитесь, что decideNextInterval() возвращает Promise<string>

  // Создаем следующий интервал
  createAction(() => createInterval(nextIntervalType))();
  return null;
};

// export default function Command(props: { launchContext?: { currentInterval: string } }) {
//   return props.launchContext?.currentInterval ? <EndOfInterval /> : <ActionsList />;
// }

// export default function Command(props: { launchContext?: { currentInterval: Interval } }) {
//   // Передаем текущий интервал в EndOfInterval, если он существует
//   // return EndOfInterval({ props.launchContext.currentInterval })
//   return props.launchContext?.currentInterval ?
//     <EndOfInterval currentInterval={props.launchContext.currentInterval} /> : <ActionsList />;
// }


export default function Command(props: { launchContext?: { currentInterval: string } }) {
  if (props.launchContext?.currentInterval) {
    return   EndOfInterval({ currentInterval: props.launchContext.currentInterval });
  } else {
    return <ActionsList />;
  }
}


function startScreenSaver() {
  exec("/usr/bin/open -a /System/Library/CoreServices/ScreenSaverEngine.app");

}