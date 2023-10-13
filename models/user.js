/** User class for message.ly */
const db = require("../db");
const ExpressError = require("../expressError");
const bcrypt = require("bcrypt");
// const jwt = require("jasonwebtoken");
const { SECRET_KEY, BCRYPT_WORK_FACTOR } = require("../config");

/** User of the site. */

class User {
  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPwd = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const resp = await db.query(
      `INSERT INTO  users (username,password, first_name, last_name, phone, join_at, last_login_at)
        values ($1, $2, $3, $4, $5, current_timestamp, current_timestamp) RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPwd, first_name, last_name, phone]
    );
    return resp.rows[0];
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const resp = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    // if (!resp.rows[0]) {
    //   throw new ExpressError("Could not find user", 404);
    // }
    return (
      resp.rows[0] && (await bcrypt.compare(password, resp.rows[0].password))
    );
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const curr = new Date();
    const resp = await db.query(
      `UPDATE users SET last_login_at = $1 WHERE username =$2  RETURNING username`,
      [curr, username]
    );
    if (!resp.rows[0]) {
      throw new ExpressError("could not find user", 404);
    }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const resp = await db.query(
      "SELECT username, first_name, last_name, phone FROM users ORDER BY username"
    );
    if (resp.rows.length === 0) {
      throw new ExpressError("No users found", 404);
    }
    return resp.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const resp = await db.query(
      `SELECT username,
    first_name,
    last_name,
    phone,
    join_at,
    last_login_at FROM users WHERE username = $1`,
      [username]
    );
    if (!resp.rows[0]) {
      throw new ExpressError("Could not find user", 404);
    }
    return resp.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const resp = await db.query(
      "SELECT id, to_username, body, sent_at, read_at, u.username FROM messages INNER JOIN users as u ON (to_username = u.username) WHERE from_username = $1",
      [username]
    );
    console.log("rows returned from getting message", resp.rows);

    let user = await db.query(
      "SELECT username, first_name, last_name, phone FROM users WHERE username = $1",
      [resp.rows[0].to_username]
    );
    user = user.rows[0];
    if (!user) {
      throw new ExpressError("User not found", 404);
    }
    const messages = resp.rows.map((m) => ({
      id: m.id,
      to_user: user,
      body: m.body,
      sent_at: m.sent_at,
      read_at: m.read_at,
    }));
    return messages;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const resp = await db.query(
      "SELECT id, from_username, body, sent_at, read_at, u.username  FROM messages INNER JOIN users as u ON (from_username = u.username) WHERE to_username = $1",
      [username]
    );
    console.log("rows returned from getting message", resp.rows);

    let user = await db.query(
      "SELECT username, first_name, last_name, phone FROM users WHERE username = $1",
      [resp.rows[0].from_username]
    );
    user = user.rows[0];
    if (!user) {
      throw new ExpressError("User not found", 404);
    }
    const messages = resp.rows.map((m) => ({
      id: m.id,
      from_user: user,
      body: m.body,
      sent_at: m.sent_at,
      read_at: m.read_at,
    }));
    return messages;
  }
}

module.exports = User;
