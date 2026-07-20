import { Schema, models, model } from "mongoose";


const SubMenuFixedSchema = new Schema(
    {
        active: { type: Boolean },
        catTitle: { type: String },
        subCat: [
            {
                title: { type: String },
                subCatPackage: [
                    {
                        title: { type: String },
                        url: { type: String },
                        active: { type: Boolean },
                    }
                ],
                active: { type: Boolean },
            }
        ]
    },
    { timestamps: true }
);

export default models.SubMenuFixed || model("SubMenuFixed", SubMenuFixedSchema);