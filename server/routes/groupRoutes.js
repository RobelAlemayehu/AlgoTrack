const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createGroup,
  joinGroup,
  leaveGroup,
  getUserGroups,
  getGroupLeaderboard,
  getGroupMemberProfile
} = require('../controller/groupController');

router.post('/create', auth, createGroup);
router.post('/join', auth, joinGroup);
router.delete('/:groupId/leave', auth, leaveGroup);
router.get('/my-groups', auth, getUserGroups);
router.get('/:groupId/leaderboard', auth, getGroupLeaderboard);
router.get('/:groupId/member/:memberId', auth, getGroupMemberProfile);

module.exports = router;
