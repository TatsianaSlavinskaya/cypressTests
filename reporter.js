const RPClient = require("reportportal-client");
const mocha = require("mocha");

const STATUS = {
  PASSED: "PASSED",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
};

const LEVEL = {
  ERROR: "ERROR",
  TRACE: "TRACE",
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  EMPTY: ""
};

const TYPE = {
  SUITE: "SUITE",
  STORY: "STORY",
  TEST: "TEST",
  SCENARIO: "SCENARIO",
  STEP: "STEP",
};

const Base = mocha.reporters.Base;

function Reporter (runner) {

  Base.call(this, runner);

  const config ={
    attachScreenshots: true,
    showPassedHooks: false,
    token: "gchgcvjhv",
    launch: "tatsiana_slavinskaya_TEST_EXAMPLE",
    project: "tatsiana_slavinskaya_personal",
    endpoint: "https://rp.epam.com/api/v1",
  };

  const client = new RPClient(config);

  const state = {
    temp_launch_id: null,
    launch_status: STATUS.PASSED,
    suit_status: STATUS.PASSED,
    test_status: STATUS.PASSED,
    finish: false,
    promise: Promise.resolve(null),
  };

  const parent_ids = [];

  const setLaunchId = (id) => state.temp_launch_id = id;

  const getParentId = () => parent_ids.length > 0 ? parent_ids[parent_ids.length - 1] : null;

  const setParentId = (id) => parent_ids.push(id);

  const removeParent = () => parent_ids.pop();

  const startLaunch = async () => {
    const rp_obj = client.startLaunch({});
    setLaunchId(rp_obj.tempId);
    state.promise = rp_obj.promise
  };

  const finishLaunch = async () => {
    await state.promise;

    client.finishLaunch(state.temp_launch_id, {
      status: state.launch_status
    }).promise.then(() => {
      state.finish = true;
    }, (err) => {
      state.finish = true;
      console.error(err);
    });
  };

  const startTest = async (test) => {
    await state.promise;
    const rp_obj = client.startTestItem({
      type: TYPE.STEP,
      description: test.fullTitle(),
      name: test.title
    }, state.temp_launch_id, getParentId());
    setParentId(rp_obj.tempId);
    state.promise = rp_obj.promise
  };

  const finishTest = async (test) => {
    await state.promise;
    if (test.log) {
      client.sendLog(getParentId(), {
        message: test.log,
        level: LEVEL.INFO
      });
    }
    const rp_obj = client.finishTestItem(getParentId(), {
      status: STATUS.PASSED
    });
    removeParent();
    state.promise = rp_obj.promise
  };

  const finishFailedTest = async (test) => {
    await state.promise;
    const parent_id = getParentId();
    state.promise.then(() => {
      if (test.err.actual && test.err.expected) {
        client.sendLog(parent_id, {
          message: 'Actual:\n' + test.err.actual + '\nExpected:\n' + test.err.expected,
          level: LEVEL.ERROR
        });
      }
      if (test.log) {
        client.sendLog(parent_id, {
          message: test.log,
          level: LEVEL.INFO
        });
      }
       client.finishTestItem(parent_id, {
        status: STATUS.FAILED
      });
    });
    removeParent();
  };

  runner.on('start', () => {
    state.launch_status = STATUS.PASSED;
    try {
      startLaunch();
    } catch (err) {
      console.error('Failed to start launch: ', err);
    }
  });

  runner.once('end', () => {
    try {
      finishLaunch();
      this.epilogue();
    } catch (err) {
      console.error('Failed to finish launch: ', err);
    }
  });

  runner.on('pass', (test) => {
    state.test_status = STATUS.PASSED;
    try {
      startTest(test);
      finishTest(test);
    } catch (err) {
      console.error('Failed to add passed test: ', err);
    }
  });

  runner.on('fail', (test) => {
    state.test_status = STATUS.FAILED;
    state.suit_status = STATUS.FAILED;
    state.launch_status = STATUS.FAILED;
    try {
        startTest(test);
        finishFailedTest(test);
    } catch (err) {
      console.error('Failed to add failed test: ', err);
    }
  });

  runner.on('pending', (test) => {
    state.test_status = STATUS.SKIPPED;
    try {
      startTest(test);
      finishTest(test);
    } catch (err) {
      console.error('Failed to add pending test: ', err);
    }
  });

}

mocha.utils.inherits(Reporter, Base);

module.exports = Reporter;