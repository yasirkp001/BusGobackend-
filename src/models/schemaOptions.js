// Shared Mongoose serialization options.
// Any model using these exposes a string `id` (derived from `_id`) and hides
// `_id`, `__v`, and `password` from every JSON/object payload sent to clients —
// which is exactly the shape the frontend expects.
const transform = (doc, ret) => {
  if (ret._id != null) ret.id = ret._id.toString();
  delete ret._id;
  delete ret.password;
  return ret;
};

export const baseSchemaOptions = {
  toJSON: { versionKey: false, transform },
  toObject: { versionKey: false, transform },
};
