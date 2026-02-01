const problem = require('../models/Problem');


exports.updateNote = async (req, res) => {

    try{
        const { explanation, codeImplmentation, complexity, category, usefulResources } = req.body;

        const updateProblem = await Problem.findOneAndUpdate(
            {
                _id:req.params.id,
                userId: req.user.id
            },
            {
                $set:{
                    explanation,
                    codeImplmentation,
                    complexity,
                    category,
                    usefulResources,
                    updatedAt: new Date()
                }
            },
            {
                new:ture,
                upsert: false
            }

            
        );

        if(!updateProblem) return res.status(404).json({msg:'Note not found'})

        return res.json(updateProblem);

    }catch(err){
        res.status(500).json({ error: err.message})
    }

}