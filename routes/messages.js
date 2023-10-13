const express = require("express");
const router = express.Router();
const Message = require("../models/message");

const ExpressError = require("../expressError");
const { ensureLoggedIn, ensureCorrectUser } = require("../middleware/auth");
const { SECRET_KEY, BCRYPT_WORK_FACTOR } = require("../config");
const { route } = require("./auth");

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/

router.get("/:id", ensureLoggedIn, async (req, res, next) => {
  try {
    let username = req.user.username;

    let message = await Message.get(req.params.id);

    if (
      message.to_user.username !== username &&
      message.from_user.username !== username
    ) {
      throw new ExpressError("Cannot read this message", 401);
    }

    return res.json({ message });
  } catch (err) {
    return next(err);
  }
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/

router.post("/", ensureLoggedIn, async (req, res, next) => {
  try {
    const { to_username, body } = req.body;
    const message = await Message.create({
      from_username: req.user.username,
      to_username: to_username,
      body,
    });
    return res.json({ message });
  } catch (err) {
    return next(err);
  }
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/
router.post("/:id/read", ensureLoggedIn, async (req, res, next) => {
  try {
    let username = req.user.username;
    let msg = await Message.get(req.params.id);
    if (msg.to_user.username !== username) {
      throw new ExpressError(`Can not set`, 401);
    }
    const marked = await Message.markRead(req.params.id);
    return res.json({ message: marked });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
