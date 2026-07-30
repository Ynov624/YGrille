import * as marks from "../services/marks.service.js";
import { validateMarkPayload, validateGroupMarkPayload } from "../utils/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const list = asyncHandler(async (req, res) => {
  res.json(await marks.listMarks(req.params.gridId, req.user.id));
});

export const setMark = asyncHandler(async (req, res) => {
  const payload = validateMarkPayload(req.body);
  res.json(
    await marks.setMark(req.params.gridId, req.user.id, req.params.studentId, req.params.criterionId, payload)
  );
});

export const setGroupMark = asyncHandler(async (req, res) => {
  const { levelPosition } = validateGroupMarkPayload(req.body);
  res.json(
    await marks.setGroupMark(req.params.gridId, req.user.id, req.params.groupId, req.params.criterionId, levelPosition)
  );
});
