import express from 'express';
import { deleteRequestController } from '../controllers';
import { roleCheck } from '../helper';
import { ROLES } from '../common';

const router = express.Router();

router.post('/update', roleCheck([ROLES.ADMIN]), deleteRequestController.updateDeleteRequest);
router.get('/get', roleCheck([ROLES.ADMIN]), deleteRequestController.getDeleteRequest);

export default router;